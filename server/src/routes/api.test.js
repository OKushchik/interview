import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import express from 'express'
import cookieParser from 'cookie-parser'
import { signAuthToken } from '../middleware/requireAuth.js'
import { createCompaniesRouter } from './companies.js'
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
    Company: table([]),
    UserCompanyAccess: table([]),
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
    const mk = async (key, role, companyId = null, extra = {}) => {
      const u = await db.User.create({ email: `${key}@x.io`, role, companyId, isGuest: false, ...extra })
      cookies[key] = signAuthToken(u, SECRET)
      return u
    }
    const a = await db.Company.create({ name: 'Acme', slug: 'acme' })
    const b = await db.Company.create({ name: 'Beta', slug: 'beta' })
    const root = await mk('root', 'super_admin')
    const adminA = await mk('adminA', 'company_admin', a.id)
    const userA = await mk('userA', 'user')
    const userNone = await mk('userNone', 'user')
    const guest = await mk('guest', 'user', null, { isGuest: true })
    await db.UserCompanyAccess.create({ userId: userA.id, companyId: a.id })
    const vacA = await db.Vacancy.create({
      userId: adminA.id, companyId: a.id, title: 'FE', level: 'junior', skills: ['React'], description: '',
    })
    const vacB = await db.Vacancy.create({
      userId: root.id, companyId: b.id, title: 'BE', level: 'senior', skills: ['Node'], description: '',
    })
    ids = { a, b, root, adminA, userA, userNone, guest, vacA, vacB }

    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use('/api/companies', createCompaniesRouter(db, SECRET))
    app.use('/api/companies/:slug/vacancies', createVacanciesRouter(db, SECRET, generator))
    app.use('/api/companies/:slug/access', createAccessRouter(db, SECRET))
    app.use('/api/users', createUsersRouter(db, SECRET))
    app.use('/api/interview', createInterviewRouter(db, SECRET, generator))
    app.use((err, _req, res, _next) => res.status(err.statusCode || 500).json({ error: err.message }))
    await new Promise((r) => {
      server = app.listen(0, r)
    })
    base = `http://127.0.0.1:${server.address().port}`
  })

  after(() => server.close())

  describe('companies', () => {
    it('requires auth', async () => {
      assert.equal((await call(null, 'GET', '/api/companies/mine')).status, 401)
    })

    it('super_admin creates a company; others get 403', async () => {
      const ok = await call('root', 'POST', '/api/companies', { name: 'Gamma', slug: 'gamma' })
      assert.equal(ok.status, 201)
      assert.equal(ok.body.company.slug, 'gamma')
      for (const who of ['adminA', 'userA']) {
        assert.equal((await call(who, 'POST', '/api/companies', { name: 'X', slug: 'xx' })).status, 403)
      }
    })

    it('rejects reserved, malformed and duplicate slugs', async () => {
      assert.equal((await call('root', 'POST', '/api/companies', { name: 'X', slug: 'admin' })).status, 400)
      assert.equal((await call('root', 'POST', '/api/companies', { name: 'X', slug: 'A b' })).status, 400)
      assert.equal((await call('root', 'POST', '/api/companies', { name: 'X', slug: 'acme' })).status, 409)
    })

    it('GET /mine returns only accessible companies', async () => {
      const slugs = async (who) => (await call(who, 'GET', '/api/companies/mine')).body.companies.map((c) => c.slug)
      assert.deepEqual(await slugs('userA'), ['acme'])
      assert.deepEqual(await slugs('adminA'), ['acme'])
      assert.deepEqual(await slugs('userNone'), [])
      assert.ok((await slugs('root')).includes('beta'))
    })

    it('super_admin can rename and delete a company', async () => {
      const c = await call('root', 'POST', '/api/companies', { name: 'Tmp', slug: 'tmp' })
      assert.equal(c.status, 201)
      const patched = await call('root', 'PATCH', '/api/companies/tmp', { name: 'Tmp2' })
      assert.equal(patched.body.company.name, 'Tmp2')
      assert.equal((await call('root', 'DELETE', '/api/companies/tmp')).status, 204)
      assert.equal((await call('root', 'GET', '/api/companies/tmp')).status, 404)
    })
  })

  describe('vacancies', () => {
    it('user with access reads vacancies but cannot create', async () => {
      const list = await call('userA', 'GET', '/api/companies/acme/vacancies')
      assert.equal(list.status, 200)
      assert.equal(list.body.vacancies.length, 1)
      const create = await call('userA', 'POST', '/api/companies/acme/vacancies', {
        title: 'X', level: 'junior', skills: ['a'],
      })
      assert.equal(create.status, 403)
    })

    it('user without access gets 403, unknown slug gets 404', async () => {
      assert.equal((await call('userNone', 'GET', '/api/companies/acme/vacancies')).status, 403)
      assert.equal((await call('userA', 'GET', '/api/companies/beta/vacancies')).status, 403)
      assert.equal((await call('root', 'GET', '/api/companies/nope/vacancies')).status, 404)
    })

    it('company_admin creates vacancy in own company; companyId comes from the company, not the body', async () => {
      const res = await call('adminA', 'POST', '/api/companies/acme/vacancies', {
        title: 'New', level: 'middle', skills: ['TS'], companyId: ids.b.id,
      })
      assert.equal(res.status, 201)
      assert.equal(res.body.vacancy.companyId, ids.a.id)
    })

    it('company_admin cannot touch a foreign company', async () => {
      const create = await call('adminA', 'POST', '/api/companies/beta/vacancies', {
        title: 'X', level: 'junior', skills: ['a'],
      })
      assert.equal(create.status, 403)
      assert.equal((await call('adminA', 'DELETE', `/api/companies/beta/vacancies/${ids.vacB.id}`)).status, 403)
    })

    it('does not leak a vacancy of another company through own slug', async () => {
      const res = await call('root', 'GET', `/api/companies/acme/vacancies/${ids.vacB.id}`)
      assert.equal(res.status, 404)
    })

    it('super_admin creates in any company', async () => {
      const res = await call('root', 'POST', '/api/companies/beta/vacancies', {
        title: 'Y', level: 'junior', skills: ['a'],
      })
      assert.equal(res.status, 201)
      assert.equal(res.body.vacancy.companyId, ids.b.id)
    })
  })

  describe('access', () => {
    it('company_admin grants and revokes access in own company only', async () => {
      const grant = await call('adminA', 'POST', '/api/companies/acme/access', { userId: ids.userNone.id })
      assert.equal(grant.status, 201)
      assert.equal((await call('userNone', 'GET', '/api/companies/acme/vacancies')).status, 200)
      const again = await call('adminA', 'POST', '/api/companies/acme/access', { userId: ids.userNone.id })
      assert.equal(again.status, 200)

      const list = await call('adminA', 'GET', '/api/companies/acme/access')
      assert.ok(list.body.access.some((x) => x.userId === ids.userNone.id))

      assert.equal((await call('adminA', 'DELETE', `/api/companies/acme/access/${ids.userNone.id}`)).status, 204)
      assert.equal((await call('userNone', 'GET', '/api/companies/acme/vacancies')).status, 403)
      assert.equal((await call('adminA', 'DELETE', `/api/companies/acme/access/${ids.userNone.id}`)).status, 404)
    })

    it('company_admin cannot manage access of a foreign company', async () => {
      const res = await call('adminA', 'POST', '/api/companies/beta/access', { userId: ids.userNone.id })
      assert.equal(res.status, 403)
    })

    it('plain user cannot manage access; super_admin can for any company', async () => {
      assert.equal((await call('userA', 'GET', '/api/companies/acme/access')).status, 403)
      const res = await call('root', 'POST', '/api/companies/beta/access', { userId: ids.userA.id })
      assert.equal(res.status, 201)
    })

    it('access cannot be granted to admins or guests', async () => {
      assert.equal((await call('root', 'POST', '/api/companies/acme/access', { userId: ids.adminA.id })).status, 400)
      assert.equal((await call('root', 'POST', '/api/companies/acme/access', { userId: ids.guest.id })).status, 400)
      assert.equal((await call('root', 'POST', '/api/companies/acme/access', { userId: 'nope' })).status, 404)
    })
  })

  describe('users', () => {
    it('only super_admin lists users and changes roles', async () => {
      assert.equal((await call('adminA', 'GET', '/api/users')).status, 403)
      const list = await call('root', 'GET', '/api/users')
      assert.equal(list.status, 200)
      assert.ok(!('passwordHash' in list.body.users[0]))
    })

    it('company_admin requires companyId; role change binds company', async () => {
      const bad = await call('root', 'PATCH', `/api/users/${ids.userNone.id}`, { role: 'company_admin' })
      assert.equal(bad.status, 400)
      const ok = await call('root', 'PATCH', `/api/users/${ids.userNone.id}`, {
        role: 'company_admin', companyId: ids.b.id,
      })
      assert.equal(ok.body.user.role, 'company_admin')
      assert.equal(ok.body.user.companyId, ids.b.id)
      const back = await call('root', 'PATCH', `/api/users/${ids.userNone.id}`, { role: 'user' })
      assert.equal(back.body.user.companyId, null)
    })

    it('super_admin cannot demote self; guest cannot be changed', async () => {
      assert.equal((await call('root', 'PATCH', `/api/users/${ids.root.id}`, { role: 'user' })).status, 400)
      assert.equal((await call('root', 'PATCH', `/api/users/${ids.guest.id}`, { role: 'company_admin', companyId: ids.a.id })).status, 400)
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

    it('returns 403 for a vacancy of a company without access and 404 for unknown id', async () => {
      assert.equal((await call('adminA', 'POST', '/api/interview/prepare', { vacancyId: ids.vacB.id, config })).status, 403)
      assert.equal((await call('userA', 'POST', '/api/interview/prepare', { vacancyId: 'nope', config })).status, 404)
    })

    it('ignores a vacancy object in the body', async () => {
      const res = await call('userA', 'POST', '/api/interview/prepare', {
        vacancy: { id: 'x', title: 't', level: 'junior', skills: [], description: '' }, config,
      })
      assert.equal(res.status, 400)
    })
  })
})
