import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import express from 'express'
import cookieParser from 'cookie-parser'
import { signAuthToken } from '../middleware/requireAuth.js'
import { createProvidersRouter } from './providers.js'
import { createUsersRouter } from './users.js'
import { createAccessRouter } from './access.js'
import { createVacanciesRouter } from './vacancies.js'
import { createInterviewRouter } from './interview.js'

const SECRET = 'test-secret'

/** Мінімальна in-memory БД з тим самим інтерфейсом, що й db/index.js. */
function createFakeDb() {
  let seq = 0
  const t = new Date('2026-01-01')
  const match = (row, where = {}) =>
    Object.entries(where).every(([k, v]) => (Array.isArray(v) ? v.includes(row[k]) : row[k] === v))
  const table = (rows) => ({
    rows,
    async findOne({ where }) {
      return rows.find((r) => match(r, where)) ?? null
    },
    async findAll({ where } = {}) {
      return rows.filter((r) => match(r, where))
    },
    async create(values) {
      const row = { id: `id${++seq}`, createdAt: t, updatedAt: t, ...values }
      rows.push(row)
      return row
    },
    async update(values, { where }) {
      const row = rows.find((r) => match(r, where))
      if (!row) throw new Error('not found')
      Object.assign(row, values)
      return row
    },
    async destroy({ where }) {
      for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i], where)) rows.splice(i, 1)
    },
  })
  return {
    User: table([]),
    Provider: table([]),
    UserProviderAccess: table([]),
    Vacancy: table([]),
  }
}

const generator = {
  generateQuiz: async () => [{ id: 'q1', question: 'Q?', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }],
  generateBot: async () => [{ id: 'b1', question: 'Q?' }],
  generateCoding: async () => ({ id: 'c', title: 't', description: 'd', starterCode: '' }),
}

describe('multitenant API', () => {
  const db = createFakeDb()
  let server
  let base
  let ids
  const cookies = {}

  async function call(as, method, path, body) {
    const res = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(as ? { Cookie: `access_token=${cookies[as]}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    return { status: res.status, body: text ? JSON.parse(text) : null }
  }

  before(async () => {
    const mk = async (key, role, providerId = null, extra = {}) => {
      const u = await db.User.create({ email: `${key.toLowerCase()}@x.io`, role, providerId, isGuest: false, ...extra })
      cookies[key] = signAuthToken(u, SECRET)
      return u
    }
    const a = await db.Provider.create({ name: 'Acme', slug: 'acme' })
    const b = await db.Provider.create({ name: 'Beta', slug: 'beta' })
    const root = await mk('root', 'super_admin')
    const adminA = await mk('adminA', 'provider_admin', a.id)
    const userA = await mk('userA', 'user')
    const userNone = await mk('userNone', 'user')
    const guest = await mk('guest', 'user', null, { isGuest: true })
    await db.UserProviderAccess.create({ userId: userA.id, providerId: a.id })
    const vacA = await db.Vacancy.create({
      userId: adminA.id, providerId: a.id, title: 'FE', level: 'junior', skills: ['React'], description: '',
    })
    const vacB = await db.Vacancy.create({
      userId: root.id, providerId: b.id, title: 'BE', level: 'senior', skills: ['Node'], description: '',
    })
    ids = { a, b, root, adminA, userA, userNone, guest, vacA, vacB }

    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/providers', createProvidersRouter(db, SECRET))
    app.use('/api/providers/:slug/vacancies', createVacanciesRouter(db, SECRET, generator))
    app.use('/api/providers/:slug/access', createAccessRouter(db, SECRET))
    app.use('/api/users', createUsersRouter(db, SECRET))
    app.use('/api/interview', createInterviewRouter(db, SECRET, generator))
    app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }))
    await new Promise((r) => {
      server = app.listen(0, r)
    })
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(() => server.close())

  describe('providers', () => {
    it('requires auth', async () => {
      assert.equal((await call(null, 'GET', '/api/providers/mine')).status, 401)
    })

    it('super_admin creates a provider; others get 403', async () => {
      const ok = await call('root', 'POST', '/api/providers', { name: 'Gamma', slug: 'gamma' })
      assert.equal(ok.status, 201)
      assert.equal(ok.body.provider.slug, 'gamma')
      for (const who of ['adminA', 'userA']) {
        assert.equal((await call(who, 'POST', '/api/providers', { name: 'X', slug: 'xx' })).status, 403)
      }
    })

    it('rejects reserved, malformed and duplicate slugs', async () => {
      assert.equal((await call('root', 'POST', '/api/providers', { name: 'X', slug: 'mine' })).status, 400)
      assert.equal((await call('root', 'POST', '/api/providers', { name: 'X', slug: 'A b' })).status, 400)
      assert.equal((await call('root', 'POST', '/api/providers', { name: 'X', slug: 'acme' })).status, 409)
    })

    it('GET /mine returns only accessible providers', async () => {
      const slugs = async (who) => (await call(who, 'GET', '/api/providers/mine')).body.providers.map((c) => c.slug)
      assert.deepEqual(await slugs('userA'), ['acme'])
      assert.deepEqual(await slugs('adminA'), ['acme'])
      assert.deepEqual(await slugs('userNone'), [])
      assert.ok((await slugs('root')).includes('beta'))
    })

    it('super_admin can rename and delete a provider', async () => {
      const c = await call('root', 'POST', '/api/providers', { name: 'Tmp', slug: 'tmp' })
      assert.equal(c.status, 201)
      const patched = await call('root', 'PATCH', '/api/providers/tmp', { name: 'Tmp2' })
      assert.equal(patched.body.provider.name, 'Tmp2')
      assert.equal((await call('root', 'DELETE', '/api/providers/tmp')).status, 204)
      assert.equal((await call('root', 'GET', '/api/providers/tmp')).status, 404)
    })
  })

  describe('vacancies', () => {
    it('user with access reads vacancies but cannot create', async () => {
      const list = await call('userA', 'GET', '/api/providers/acme/vacancies')
      assert.equal(list.status, 200)
      assert.equal(list.body.vacancies.length, 1)
      const create = await call('userA', 'POST', '/api/providers/acme/vacancies', {
        title: 'X', level: 'junior', skills: ['a'],
      })
      assert.equal(create.status, 403)
    })

    it('user without access gets 403, unknown slug gets 404', async () => {
      assert.equal((await call('userNone', 'GET', '/api/providers/acme/vacancies')).status, 403)
      assert.equal((await call('userA', 'GET', '/api/providers/beta/vacancies')).status, 403)
      assert.equal((await call('root', 'GET', '/api/providers/nope/vacancies')).status, 404)
    })

    it('provider_admin creates vacancy in own provider; providerId comes from the provider, not the body', async () => {
      const res = await call('adminA', 'POST', '/api/providers/acme/vacancies', {
        title: 'New', level: 'middle', skills: ['TS'], providerId: ids.b.id,
      })
      assert.equal(res.status, 201)
      assert.equal(res.body.vacancy.providerId, ids.a.id)
    })

    it('provider_admin cannot touch a foreign provider', async () => {
      const create = await call('adminA', 'POST', '/api/providers/beta/vacancies', {
        title: 'X', level: 'junior', skills: ['a'],
      })
      assert.equal(create.status, 403)
      assert.equal((await call('adminA', 'DELETE', `/api/providers/beta/vacancies/${ids.vacB.id}`)).status, 403)
    })

    it('does not leak a vacancy of another provider through own slug', async () => {
      const res = await call('root', 'GET', `/api/providers/acme/vacancies/${ids.vacB.id}`)
      assert.equal(res.status, 404)
    })

    it('super_admin creates in any provider', async () => {
      const res = await call('root', 'POST', '/api/providers/beta/vacancies', {
        title: 'Y', level: 'junior', skills: ['a'],
      })
      assert.equal(res.status, 201)
      assert.equal(res.body.vacancy.providerId, ids.b.id)
    })
  })

  describe('access', () => {
    it('provider_admin grants and revokes access in own provider only', async () => {
      const grant = await call('adminA', 'POST', '/api/providers/acme/access', { userId: ids.userNone.id })
      assert.equal(grant.status, 201)
      assert.equal((await call('userNone', 'GET', '/api/providers/acme/vacancies')).status, 200)
      const again = await call('adminA', 'POST', '/api/providers/acme/access', { userId: ids.userNone.id })
      assert.equal(again.status, 200)

      const list = await call('adminA', 'GET', '/api/providers/acme/access')
      assert.ok(list.body.access.some((x) => x.userId === ids.userNone.id))

      assert.equal((await call('adminA', 'DELETE', `/api/providers/acme/access/${ids.userNone.id}`)).status, 204)
      assert.equal((await call('userNone', 'GET', '/api/providers/acme/vacancies')).status, 403)
      assert.equal((await call('adminA', 'DELETE', `/api/providers/acme/access/${ids.userNone.id}`)).status, 404)
    })

    it('provider_admin cannot manage access of a foreign provider', async () => {
      const res = await call('adminA', 'POST', '/api/providers/beta/access', { userId: ids.userNone.id })
      assert.equal(res.status, 403)
    })

    it('plain user cannot manage access; super_admin can for any provider', async () => {
      assert.equal((await call('userA', 'GET', '/api/providers/acme/access')).status, 403)
      const res = await call('root', 'POST', '/api/providers/beta/access', { userId: ids.userA.id })
      assert.equal(res.status, 201)
    })

    it('grants access by email', async () => {
      const grant = await call('adminA', 'POST', '/api/providers/acme/access', { email: 'USERNONE@x.io' })
      assert.equal(grant.status, 201)
      assert.equal((await call('userNone', 'GET', '/api/providers/acme/vacancies')).status, 200)
      assert.equal((await call('adminA', 'POST', '/api/providers/acme/access', { email: 'nobody@x.io' })).status, 404)
      await call('adminA', 'DELETE', `/api/providers/acme/access/${ids.userNone.id}`)
    })

    it('access cannot be granted to admins or guests', async () => {
      assert.equal((await call('root', 'POST', '/api/providers/acme/access', { userId: ids.adminA.id })).status, 400)
      assert.equal((await call('root', 'POST', '/api/providers/acme/access', { userId: ids.guest.id })).status, 400)
      assert.equal((await call('root', 'POST', '/api/providers/acme/access', { userId: 'nope' })).status, 404)
    })
  })

  describe('users', () => {
    it('only super_admin lists users and changes roles', async () => {
      assert.equal((await call('adminA', 'GET', '/api/users')).status, 403)
      const list = await call('root', 'GET', '/api/users')
      assert.equal(list.status, 200)
      assert.ok(!('passwordHash' in list.body.users[0]))
    })

    it('provider_admin requires providerId; role change binds provider', async () => {
      const bad = await call('root', 'PATCH', `/api/users/${ids.userNone.id}`, { role: 'provider_admin' })
      assert.equal(bad.status, 400)
      const ok = await call('root', 'PATCH', `/api/users/${ids.userNone.id}`, {
        role: 'provider_admin', providerId: ids.b.id,
      })
      assert.equal(ok.body.user.role, 'provider_admin')
      assert.equal(ok.body.user.providerId, ids.b.id)
      const back = await call('root', 'PATCH', `/api/users/${ids.userNone.id}`, { role: 'user' })
      assert.equal(back.body.user.providerId, null)
    })

    it('super_admin cannot demote self; guest cannot be changed', async () => {
      assert.equal((await call('root', 'PATCH', `/api/users/${ids.root.id}`, { role: 'user' })).status, 400)
      assert.equal((await call('root', 'PATCH', `/api/users/${ids.guest.id}`, { role: 'provider_admin', providerId: ids.a.id })).status, 400)
    })
  })

  describe('interview prepare', () => {
    const config = { type: 'quiz', questionCount: 3, enableCoding: false }

    it('takes the vacancy from the DB for a user with access', async () => {
      const res = await call('userA', 'POST', '/api/interview/prepare', { vacancyId: ids.vacA.id, config })
      assert.equal(res.status, 200)
      assert.equal(res.body.vacancy.id, ids.vacA.id)
      assert.equal(res.body.quizQuestions.length, 1)
    })

    it('returns 403 for a vacancy of a provider without access and 404 for unknown id', async () => {
      assert.equal((await call('adminA', 'POST', '/api/interview/prepare', { vacancyId: ids.vacB.id, config })).status, 403)
      assert.equal((await call('userA', 'POST', '/api/interview/prepare', { vacancyId: 'nope', config })).status, 404)
    })

    it('accepts an inline (mock) vacancy without a provider and ignores ready-made questions', async () => {
      const res = await call('userA', 'POST', '/api/interview/prepare', {
        vacancy: {
          id: 'mock-1', title: 't', level: 'junior', skills: ['React'], description: '',
          quizQuestions: [{ id: 'evil', question: 'x', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }],
        },
        config,
      })
      assert.equal(res.status, 200)
      assert.equal(res.body.vacancy.id, 'mock-1')
      assert.equal(res.body.quizQuestions[0].id, 'q1')
    })

    it('rejects a body with neither vacancyId nor a valid vacancy', async () => {
      assert.equal((await call('userA', 'POST', '/api/interview/prepare', { config })).status, 400)
    })
  })
})
