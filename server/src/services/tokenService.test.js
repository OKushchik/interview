import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createTokenPair, hashToken, isExpired } from './tokenService.js'

describe('tokenService', () => {
  it('hashToken is stable sha256 hex', () => {
    const h = hashToken('abc')
    assert.equal(h, hashToken('abc'))
    assert.equal(h.length, 64)
    assert.notEqual(h, 'abc')
  })

  it('createTokenPair returns raw token, matching hash, future expiry', () => {
    const { token, tokenHash, expiresAt } = createTokenPair(24)
    assert.equal(token.length, 64)
    assert.equal(tokenHash, hashToken(token))
    assert.ok(expiresAt.getTime() > Date.now())
  })

  it('isExpired detects past dates', () => {
    assert.equal(isExpired(new Date(Date.now() - 1000)), true)
    assert.equal(isExpired(new Date(Date.now() + 60_000)), false)
    assert.equal(isExpired(null), true)
  })
})
