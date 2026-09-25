import { createHash, randomBytes } from 'node:crypto'

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function createTokenPair(ttlHours) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
  return { token, tokenHash, expiresAt }
}

export function isExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() <= now.getTime()
}
