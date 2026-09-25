import bcrypt from 'bcryptjs'
import { listVacancies } from './vacancyService.js'
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
  const vacancies = await listVacancies(db)
  return {
    id: user.id,
    email: user.email,
    role: user.role ?? 'candidate',
    pendingEmail: user.pendingEmail ?? null,
    vacancies,
  }
}
