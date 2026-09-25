import jwt from 'jsonwebtoken'

const COOKIE_NAME = 'access_token'
const TTL_MS = 7 * 24 * 60 * 60 * 1000

export function signAuthToken(user, secret) {
  return jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '7d' })
}

export function verifyAuthToken(token, secret) {
  const payload = jwt.verify(token, secret)
  return { id: payload.sub, email: payload.email, vacancies: [] }
}

export function setAuthCookie(res, token, secure) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: TTL_MS,
    path: '/',
  })
}

export function clearAuthCookie(res, secure) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
  })
}

export function createRequireAuth(jwtSecret) {
  return function requireAuth(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    try {
      req.user = verifyAuthToken(token, jwtSecret)
      next()
    } catch {
      res.status(401).json({ error: 'Unauthorized' })
    }
  }
}
