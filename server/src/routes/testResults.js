import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireRole } from '../middleware/requireRole.js'
import { adminProviderLevels } from '../services/providerAccess.js'
import { toInterviewResultDto, toOwnInterviewResultDto, toTeamResultDto, toTestResultDto } from '../services/schemas.js'

/** /api/test-results - test results of the current user ('Analysis' tab). */
export function createTestResultsRouter(db, jwtSecret) {
  const router = Router()
  router.use(createRequireAuth(jwtSecret))
  // Results are not saved for a guest, so they have no analysis.
  router.use(async (req, res, next) => {
    try {
      const user = await db.User.findOne({ where: { id: req.user.id } })
      if (!user || user.isGuest) {
        res.status(403).json({ error: 'Not available for guests' })
        return
      }
      next()
    } catch (error) {
      next(error)
    }
  })

  router.get('/', async (req, res, next) => {
    try {
      const rows = await db.TestResult.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']],
      })
      res.json({ results: rows.map(toTestResultDto) })
    } catch (error) {
      next(error)
    }
  })

  // The user's own interview results ('Analysis' -> 'Interviews' tab).
  router.get('/interviews', async (req, res, next) => {
    try {
      const rows = await db.InterviewResult.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']],
      })
      res.json({ results: rows.map(toOwnInterviewResultDto) })
    } catch (error) {
      next(error)
    }
  })

  // User results across the admin's providers (where they can manage), best first.
  // super_admin sees all; ?providerId= narrows to one provider.
  const requireAdmin = createRequireRole(db)('super_admin', 'provider_admin')

  /** Responds with a list of model results; `toDto(row, email)` and `tiebreak` define the shape and sorting. */
  const teamHandler = (model, toDto, tiebreak) => async (req, res, next) => {
    try {
      const user = await db.User.findOne({ where: { id: req.user.id } })
      const scope = req.query.providerId ? String(req.query.providerId) : null
      let where
      if (user.role === 'provider_admin') {
        const levels = await adminProviderLevels(db, user)
        const allowed = [...levels].filter(([, level]) => level === 'manage').map(([id]) => id)
        if (scope && !allowed.includes(scope)) {
          res.status(403).json({ error: 'Forbidden' })
          return
        }
        if (allowed.length === 0) {
          res.json({ results: [] })
          return
        }
        where = { providerId: scope ? [scope] : allowed }
      } else {
        where = scope ? { providerId: scope } : undefined
      }

      const rows = await db[model].findAll({ where, order: [['createdAt', 'DESC']] })
      const userIds = [...new Set(rows.map((r) => r.userId))]
      const users = userIds.length ? await db.User.findAll({ where: { id: userIds } }) : []
      const emails = new Map(users.map((u) => [u.id, u.email]))

      const results = rows
        .map((r) => toDto(r, emails.get(r.userId) ?? null))
        .sort((a, b) => b.score - a.score || tiebreak(a, b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      res.json({ results })
    } catch (error) {
      next(error)
    }
  }

  router.get('/team', requireAdmin, teamHandler('TestResult', toTeamResultDto, (a, b) => b.correctCount - a.correctCount))
  router.get('/team/interviews', requireAdmin, teamHandler('InterviewResult', toInterviewResultDto, () => 0))

  return router
}
