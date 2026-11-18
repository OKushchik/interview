import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createRequireCompanyAccess } from './requireCompanyAccess.js'

const own = { id: 'c1', slug: 'own', name: 'Own' }
const foreign = { id: 'c2', slug: 'foreign', name: 'Foreign' }

function makeDb(user, accessRows = []) {
  return {
    User: { findOne: async () => user },
    Company: { findOne: async ({ where }) => [own, foreign].find((c) => c.slug === where.slug) ?? null },
    UserCompanyAccess: {
      findOne: async ({ where }) =>
        accessRows.find((r) => r.userId === where.userId && r.companyId === where.companyId) ?? null,
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
  await createRequireCompanyAccess(db)(req, res, () => { nextCalled = true })
  return { req, res, nextCalled }
}

describe('requireCompanyAccess', () => {
  it('super_admin: доступ до будь-якої компанії', async () => {
    for (const slug of ['own', 'foreign']) {
      const { nextCalled, req } = await run(makeDb({ id: 'u1', role: 'super_admin', companyId: null }), slug)
      assert.equal(nextCalled, true)
      assert.equal(req.company.slug, slug)
    }
  })

  it('company_admin: своя — так, чужа — 403', async () => {
    const db = makeDb({ id: 'u1', role: 'company_admin', companyId: 'c1' })
    assert.equal((await run(db, 'own')).nextCalled, true)
    const denied = await run(db, 'foreign')
    assert.equal(denied.nextCalled, false)
    assert.equal(denied.res.statusCode, 403)
  })

  it('company_admin без компанії: 403', async () => {
    const { res } = await run(makeDb({ id: 'u1', role: 'company_admin', companyId: null }), 'own')
    assert.equal(res.statusCode, 403)
  })

  it('user: є запис — так, немає запису — 403', async () => {
    const rows = [{ userId: 'u1', companyId: 'c1' }]
    const db = makeDb({ id: 'u1', role: 'user', companyId: null }, rows)
    assert.equal((await run(db, 'own')).nextCalled, true)
    const denied = await run(db, 'foreign')
    assert.equal(denied.nextCalled, false)
    assert.equal(denied.res.statusCode, 403)
  })

  it('user з companyId, але без запису в доступах: 403', async () => {
    const { res } = await run(makeDb({ id: 'u1', role: 'user', companyId: 'c1' }), 'own')
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
