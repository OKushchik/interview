import bcrypt from 'bcryptjs'
import { listAccessibleCompanies } from './companyAccess.js'
import { clearAuthCookie, setAuthCookie, signAuthToken } from '../middleware/requireAuth.js'

const SALT_ROUNDS = 10

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}

export function issueSession(res, user, jwtSecret, secure) {
  const token = signAuthToken(user, jwtSecret)
  setAuthCookie(res, token, secure)
}

export function endSession(res, secure) {
  clearAuthCookie(res, secure)
}

export async function publicUser(db, user) {
  const accessibleCompanies = (await listAccessibleCompanies(db, user)).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }))
  return {
    id: user.id,
    email: user.email,
    role: user.role ?? 'user',
    companyId: user.companyId ?? null,
    isGuest: Boolean(user.isGuest),
    pendingEmail: user.pendingEmail ?? null,
    accessibleCompanies,
  }
}
