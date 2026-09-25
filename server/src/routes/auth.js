import { Router } from 'express'
import { hashPassword, issueSession, publicUser, verifyPassword, endSession } from '../services/authService.js'
import {
  changeEmailSchema,
  emailOnlySchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from '../services/schemas.js'
import { createRequireAuth } from '../middleware/requireAuth.js'
import {
  completeEmailChange,
  completeEmailVerification,
  completePasswordReset,
  resendEmailVerification,
  startEmailChange,
  startEmailVerification,
  startPasswordReset,
} from '../services/emailAuthService.js'

const NEUTRAL_VERIFY_MESSAGE = 'If an account exists, a verification email was sent'
const NEUTRAL_RESET_MESSAGE = 'If an account exists, password reset instructions were sent'

export function createAuthRouter(db, jwtSecret, secureCookies, deps = {}) {
  const { mail, clientOrigin = 'http://localhost:5173', emailTokenTtlHours = 24 } = deps
  const router = Router()
  const requireAuth = createRequireAuth(jwtSecret)

  const mailDeps = () => ({
    mail,
    clientOrigin,
    ttlHours: emailTokenTtlHours,
  })

  router.post('/register', async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      const existing = await db.User.findOne({ where: { email: parsed.data.email } })
      if (existing) {
        res.status(409).json({ error: 'Email already registered' })
        return
      }

      const user = await db.User.create({
        email: parsed.data.email,
        passwordHash: await hashPassword(parsed.data.password),
        emailVerified: false,
      })

      try {
        await startEmailVerification(user, mailDeps())
      } catch (error) {
        console.error(error)
        res.status(503).json({ error: 'Failed to send email' })
        return
      }

      res.status(201).json({
        message: 'Check your email to verify your account',
        email: user.email,
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/login', async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      const user = await db.User.findOne({ where: { email: parsed.data.email } })
      if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
      }

      if (!user.emailVerified) {
        res.status(403).json({ error: 'Email not verified' })
        return
      }

      const dto = await publicUser(db, user)
      issueSession(res, dto, jwtSecret, secureCookies)
      res.json({ user: dto })
    } catch (error) {
      next(error)
    }
  })

  router.post('/verify-email', async (req, res, next) => {
    try {
      const parsed = tokenSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      const user = await completeEmailVerification(db, parsed.data.token)
      if (!user) {
        res.status(400).json({ error: 'Invalid or expired token' })
        return
      }

      const dto = await publicUser(db, user)
      issueSession(res, dto, jwtSecret, secureCookies)
      res.json({ user: dto })
    } catch (error) {
      next(error)
    }
  })

  router.post('/resend-verification', async (req, res, next) => {
    try {
      const parsed = emailOnlySchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      try {
        const result = await resendEmailVerification(db, parsed.data.email, mailDeps())
        if (result.sent === false) {
          res.json({ message: NEUTRAL_VERIFY_MESSAGE })
          return
        }
      } catch (error) {
        console.error(error)
        res.status(503).json({ error: 'Failed to send email' })
        return
      }

      res.json({ message: NEUTRAL_VERIFY_MESSAGE })
    } catch (error) {
      next(error)
    }
  })

  router.post('/forgot-password', async (req, res, next) => {
    try {
      const parsed = emailOnlySchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      const user = await db.User.findOne({ where: { email: parsed.data.email } })
      if (user?.emailVerified) {
        try {
          await startPasswordReset(user, mailDeps())
        } catch (error) {
          console.error(error)
          res.status(503).json({ error: 'Failed to send email' })
          return
        }
      }

      res.json({ message: NEUTRAL_RESET_MESSAGE })
    } catch (error) {
      next(error)
    }
  })

  router.post('/reset-password', async (req, res, next) => {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      const user = await completePasswordReset(db, parsed.data.token, parsed.data.password)
      if (!user) {
        res.status(400).json({ error: 'Invalid or expired token' })
        return
      }

      res.json({ message: 'Password updated' })
    } catch (error) {
      next(error)
    }
  })

  router.post('/change-email', requireAuth, async (req, res, next) => {
    try {
      const parsed = changeEmailSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      const user = await db.User.findOne({ where: { id: req.user.id } })
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid email or password' })
        return
      }

      if (parsed.data.newEmail === user.email) {
        res.status(400).json({ error: 'New email must be different' })
        return
      }

      const taken = await db.User.findOne({ where: { email: parsed.data.newEmail } })
      if (taken) {
        res.status(409).json({ error: 'Email already registered' })
        return
      }

      try {
        await startEmailChange(user, parsed.data.newEmail, mailDeps())
      } catch (error) {
        console.error(error)
        res.status(503).json({ error: 'Failed to send email' })
        return
      }

      res.json({ message: 'Check your new email to confirm the change' })
    } catch (error) {
      next(error)
    }
  })

  router.post('/verify-email-change', async (req, res, next) => {
    try {
      const parsed = tokenSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      const user = await completeEmailChange(db, parsed.data.token)
      if (!user) {
        res.status(400).json({ error: 'Invalid or expired token' })
        return
      }

      const dto = await publicUser(db, user)
      issueSession(res, dto, jwtSecret, secureCookies)
      res.json({ user: dto })
    } catch (error) {
      next(error)
    }
  })

  router.post('/logout', (_req, res) => {
    endSession(res, secureCookies)
    res.status(204).end()
  })

  router.get('/me', requireAuth, async (req, res, next) => {
    try {
      const user = await db.User.findOne({ where: { id: req.user.id } })
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      res.json({ user: await publicUser(db, user) })
    } catch (error) {
      next(error)
    }
  })

  return router
}
