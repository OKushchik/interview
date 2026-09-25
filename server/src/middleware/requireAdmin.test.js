import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import { createRequireAdmin } from './requireAdmin.js'

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
  return res
}

describe('createRequireAdmin', () => {
  it('calls next when user role is admin', async () => {
    const db = {
      User: {
        findOne: mock.fn(async () => ({ id: '1', email: 'a@b.c', role: 'admin' })),
      },
    }
    const requireAdmin = createRequireAdmin(db)
    const req = { user: { id: '1', email: 'a@b.c' } }
    const res = mockRes()
    let nextCalled = false
    await requireAdmin(req, res, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, true)
    assert.equal(req.user.role, 'admin')
  })

  it('responds 403 when user role is candidate', async () => {
    const db = {
      User: {
        findOne: mock.fn(async () => ({ id: '1', email: 'a@b.c', role: 'candidate' })),
      },
    }
    const requireAdmin = createRequireAdmin(db)
    const req = { user: { id: '1', email: 'a@b.c' } }
    const res = mockRes()
    let nextCalled = false
    await requireAdmin(req, res, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 403)
    assert.deepEqual(res.body, { error: 'Forbidden' })
  })

  it('responds 401 when user missing in DB', async () => {
    const db = {
      User: {
        findOne: mock.fn(async () => null),
      },
    }
    const requireAdmin = createRequireAdmin(db)
    const req = { user: { id: 'missing', email: 'x@y.z' } }
    const res = mockRes()
    let nextCalled = false
    await requireAdmin(req, res, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, false)
    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.body, { error: 'Unauthorized' })
  })
})
