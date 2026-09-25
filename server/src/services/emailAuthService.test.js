import assert from 'node:assert/strict'
import { describe, it, mock } from 'node:test'
import {
  completeEmailChange,
  completeEmailVerification,
  completePasswordReset,
  resendEmailVerification,
  startEmailChange,
  startEmailVerification,
  startPasswordReset,
} from './emailAuthService.js'
import { hashToken } from './tokenService.js'

function mockUser(overrides = {}) {
  const user = {
    email: 'u@t.com',
    emailVerified: false,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
    pendingEmail: null,
    emailChangeTokenHash: null,
    emailChangeExpiresAt: null,
    passwordHash: 'old',
    update: mock.fn(async (fields) => {
      Object.assign(user, fields)
    }),
    ...overrides,
  }
  return user
}

describe('emailAuthService', () => {
  it('startEmailVerification stores hash and sends mail with verify URL', async () => {
    const user = mockUser()
    const mail = {
      sendVerificationEmail: mock.fn(async () => {}),
    }
    await startEmailVerification(user, {
      mail,
      clientOrigin: 'http://localhost:5173',
      ttlHours: 24,
    })
    assert.ok(user.emailVerificationTokenHash)
    assert.ok(user.emailVerificationExpiresAt)
    assert.equal(mail.sendVerificationEmail.mock.calls.length, 1)
    const { verifyUrl } = mail.sendVerificationEmail.mock.calls[0].arguments[0]
    assert.match(verifyUrl, /^http:\/\/localhost:5173\/verify-email\?token=/)
  })

  it('completeEmailVerification verifies user and clears token', async () => {
    const raw = 'a'.repeat(64)
    const user = mockUser({
      emailVerificationTokenHash: hashToken(raw),
      emailVerificationExpiresAt: new Date(Date.now() + 60_000),
    })
    const db = { User: { findOne: mock.fn(async () => user) } }
    const result = await completeEmailVerification(db, raw)
    assert.equal(result, user)
    assert.equal(user.emailVerified, true)
    assert.equal(user.emailVerificationTokenHash, null)
  })

  it('completeEmailVerification returns null when expired', async () => {
    const raw = 'b'.repeat(64)
    const user = mockUser({
      emailVerificationTokenHash: hashToken(raw),
      emailVerificationExpiresAt: new Date(Date.now() - 1000),
    })
    const db = { User: { findOne: mock.fn(async () => user) } }
    assert.equal(await completeEmailVerification(db, raw), null)
  })

  it('resendEmailVerification skips verified users', async () => {
    const user = mockUser({ emailVerified: true })
    const db = { User: { findOne: mock.fn(async () => user) } }
    const mail = { sendVerificationEmail: mock.fn(async () => {}) }
    const result = await resendEmailVerification(db, 'u@t.com', {
      mail,
      clientOrigin: 'http://x',
      ttlHours: 1,
    })
    assert.deepEqual(result, { sent: false })
    assert.equal(mail.sendVerificationEmail.mock.calls.length, 0)
  })

  it('startPasswordReset sends reset URL', async () => {
    const user = mockUser({ emailVerified: true })
    const mail = { sendPasswordResetEmail: mock.fn(async () => {}) }
    await startPasswordReset(user, { mail, clientOrigin: 'http://app', ttlHours: 24 })
    assert.ok(user.passwordResetTokenHash)
    const { resetUrl } = mail.sendPasswordResetEmail.mock.calls[0].arguments[0]
    assert.match(resetUrl, /\/reset-password\?token=/)
  })

  it('completePasswordReset clears reset token', async () => {
    const raw = 'c'.repeat(64)
    const user = mockUser({
      passwordResetTokenHash: hashToken(raw),
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
    })
    const db = { User: { findOne: mock.fn(async () => user) } }
    const result = await completePasswordReset(db, raw, 'newpassword1')
    assert.equal(result, user)
    assert.equal(user.passwordResetTokenHash, null)
    assert.notEqual(user.passwordHash, 'old')
  })

  it('completeEmailChange applies pendingEmail', async () => {
    const raw = 'd'.repeat(64)
    const user = mockUser({
      pendingEmail: 'new@t.com',
      emailChangeTokenHash: hashToken(raw),
      emailChangeExpiresAt: new Date(Date.now() + 60_000),
    })
    const db = { User: { findOne: mock.fn(async () => user) } }
    const result = await completeEmailChange(db, raw)
    assert.equal(result.email, 'new@t.com')
    assert.equal(user.pendingEmail, null)
    assert.equal(user.emailChangeTokenHash, null)
  })

  it('startEmailChange mails new address', async () => {
    const user = mockUser()
    const mail = { sendEmailChangeEmail: mock.fn(async () => {}) }
    await startEmailChange(user, 'new@t.com', { mail, clientOrigin: 'http://app', ttlHours: 24 })
    assert.equal(user.pendingEmail, 'new@t.com')
    const arg = mail.sendEmailChangeEmail.mock.calls[0].arguments[0]
    assert.equal(arg.to, 'new@t.com')
    assert.match(arg.verifyUrl, /\/verify-email-change\?token=/)
  })
})
