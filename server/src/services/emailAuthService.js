import { createTokenPair, hashToken, isExpired } from './tokenService.js'
import { hashPassword } from './authService.js'

export async function startEmailVerification(user, { mail, clientOrigin, ttlHours }) {
  const { token, tokenHash, expiresAt } = createTokenPair(ttlHours)
  await user.update({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: expiresAt,
  })
  const verifyUrl = `${clientOrigin}/verify-email?token=${encodeURIComponent(token)}`
  await mail.sendVerificationEmail({ to: user.email, verifyUrl })
}

export async function completeEmailVerification(db, rawToken) {
  const tokenHash = hashToken(rawToken)
  const user = await db.User.findOne({ where: { emailVerificationTokenHash: tokenHash } })
  if (!user || isExpired(user.emailVerificationExpiresAt)) {
    return null
  }
  await user.update({
    emailVerified: true,
    emailVerificationTokenHash: null,
    emailVerificationExpiresAt: null,
  })
  return user
}

export async function resendEmailVerification(db, email, deps) {
  const user = await db.User.findOne({ where: { email } })
  if (!user || user.emailVerified) {
    return { sent: false }
  }
  await startEmailVerification(user, deps)
  return { sent: true }
}

export async function startPasswordReset(user, { mail, clientOrigin, ttlHours }) {
  const { token, tokenHash, expiresAt } = createTokenPair(ttlHours)
  await user.update({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: expiresAt,
  })
  const resetUrl = `${clientOrigin}/reset-password?token=${encodeURIComponent(token)}`
  await mail.sendPasswordResetEmail({ to: user.email, resetUrl })
}

export async function completePasswordReset(db, rawToken, newPassword) {
  const tokenHash = hashToken(rawToken)
  const user = await db.User.findOne({ where: { passwordResetTokenHash: tokenHash } })
  if (!user || isExpired(user.passwordResetExpiresAt)) {
    return null
  }
  await user.update({
    passwordHash: await hashPassword(newPassword),
    passwordResetTokenHash: null,
    passwordResetExpiresAt: null,
  })
  return user
}

export async function startEmailChange(user, newEmail, { mail, clientOrigin, ttlHours }) {
  const { token, tokenHash, expiresAt } = createTokenPair(ttlHours)
  await user.update({
    pendingEmail: newEmail,
    emailChangeTokenHash: tokenHash,
    emailChangeExpiresAt: expiresAt,
  })
  const verifyUrl = `${clientOrigin}/verify-email-change?token=${encodeURIComponent(token)}`
  await mail.sendEmailChangeEmail({ to: newEmail, verifyUrl })
}

export async function completeEmailChange(db, rawToken) {
  const tokenHash = hashToken(rawToken)
  const user = await db.User.findOne({ where: { emailChangeTokenHash: tokenHash } })
  if (!user || isExpired(user.emailChangeExpiresAt) || !user.pendingEmail) {
    return null
  }
  await user.update({
    email: user.pendingEmail,
    pendingEmail: null,
    emailChangeTokenHash: null,
    emailChangeExpiresAt: null,
  })
  return user
}
