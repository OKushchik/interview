import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireRole } from '../middleware/requireRole.js'
import { adminProviderLevels } from '../services/providerAccess.js'
import { toInterviewResultDto, toOwnInterviewResultDto, toTeamResultDto, toTestResultDto } from '../services/schemas.js'

/** /api/test-results — результати тестів поточного користувача (вкладка «Аналіз»). */
export function createTestResultsRouter(db, jwtSecret) {
  const router = Router()
  router.use(createRequireAuth(jwtSecret))
  // У гостя результати не зберігаються, тож аналізу в нього немає.
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

  // Власні результати співбесід користувача (вкладка «Аналіз» → «Співбесіди»).
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

  // Результати користувачів по провайдерах адміна (де він може керувати), від найкращих.
  // super_admin бачить усі; ?providerId= звужує до одного провайдера.
  const requireAdmin = createRequireRole(db)('super_admin', 'provider_admin')

  /** Відповідає на запит списком результатів моделі; `toDto(row, email)` і `tiebreak` задають вигляд і сортування. */
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
