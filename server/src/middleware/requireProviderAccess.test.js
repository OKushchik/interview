import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRequireProviderAccess, requireProviderManage } from './requireProviderAccess.js'

const own = { id: 'c1', slug: 'own', name: 'Own' }
const foreign = { id: 'c2', slug: 'foreign', name: 'Foreign' }

function makeDb(user, accessRows = []) {
  return {
    User: { findOne: async () => user },
    Provider: { findOne: async ({ where }) => [own, foreign].find((c) => c.slug === where.slug) ?? null },
    UserProviderAccess: {
      findAll: async ({ where }) => accessRows.filter((r) => r.userId === where.userId),
      findOne: async ({ where }) =>
        accessRows.find((r) => r.userId === where.userId && r.providerId === where.providerId) ?? null,
    },
  }
}

async function run(db, slug) {
  const req = { user: { id: 'u1' }, params: { slug } }
  const res = {
    statusCode: 200,
    body: undefined,
    status(c) { this.statusCode = c; return this },
    json(p) { this.body = p; return this },
  }
  let nextCalled = false
  await createRequireProviderAccess(db)(req, res, () => { nextCalled = true })
  return { req, res, nextCalled }
}

describe('requireProviderAccess', () => {
  it('super_admin: доступ до будь-якої компанії', async () => {
    for (const slug of ['own', 'foreign']) {
      const { nextCalled, req } = await run(makeDb({ id: 'u1', role: 'super_admin', providerId: null }), slug)
      assert.equal(nextCalled, true)
      assert.equal(req.provider.slug, slug)
    }
  })

  it('provider_admin: своя — так, чужа — 403', async () => {
    const db = makeDb({ id: 'u1', role: 'provider_admin', providerId: 'c1' })
    assert.equal((await run(db, 'own')).nextCalled, true)
    const denied = await run(db, 'foreign')
    assert.equal(denied.nextCalled, false)
    assert.equal(denied.res.statusCode, 403)
  })

  it('provider_admin з кількома провайдерами: доступ до кожного свого', async () => {
    const rows = [{ userId: 'u1', providerId: 'c1' }, { userId: 'u1', providerId: 'c2', accessLevel: 'manage' }]
    const db = makeDb({ id: 'u1', role: 'provider_admin', providerId: 'c1' }, rows)
    assert.equal((await run(db, 'own')).nextCalled, true)
    assert.equal((await run(db, 'foreign')).req.providerLevel, 'manage')
  })

  it('provider_admin: провайдер «лише перегляд» — доступ є, але керувати не можна', async () => {
    const rows = [{ userId: 'u1', providerId: 'c2', accessLevel: 'view' }]
    const db = makeDb({ id: 'u1', role: 'provider_admin', providerId: 'c1' }, rows)
    const own = await run(db, 'own')
    assert.equal(own.req.providerLevel, 'manage')
    const view = await run(db, 'foreign')
    assert.equal(view.nextCalled, true)
    assert.equal(view.req.providerLevel, 'view')

    for (const [req, expected] of [[own.req, 200], [view.req, 403]]) {
      const res = { statusCode: 200, status(c) { this.statusCode = c; return this }, json() { return this } }
      let passed = false
      requireProviderManage(req, res, () => { passed = true })
      assert.equal(passed, expected === 200)
      assert.equal(res.statusCode, expected)
    }
  })

  it('provider_admin без компанії: 403', async () => {
    const { res } = await run(makeDb({ id: 'u1', role: 'provider_admin', providerId: null }), 'own')
    assert.equal(res.statusCode, 403)
  })

  it('user: є запис — так, немає запису — 403', async () => {
    const rows = [{ userId: 'u1', providerId: 'c1' }]
    const db = makeDb({ id: 'u1', role: 'user', providerId: null }, rows)
    assert.equal((await run(db, 'own')).nextCalled, true)
    const denied = await run(db, 'foreign')
    assert.equal(denied.nextCalled, false)
    assert.equal(denied.res.statusCode, 403)
  })

  it('user з providerId, але без запису в доступах: 403', async () => {
    const { res } = await run(makeDb({ id: 'u1', role: 'user', providerId: 'c1' }), 'own')
    assert.equal(res.statusCode, 403)
  })

  it('невідомий slug: 404', async () => {
    const { res, nextCalled } = await run(makeDb({ id: 'u1', role: 'super_admin' }), 'nope')
    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 404)
  })

  it('немає користувача в БД: 401', async () => {
    const { res } = await run(makeDb(null), 'own')
    assert.equal(res.statusCode, 401)
  })
})
