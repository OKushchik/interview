import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireRole } from '../middleware/requireRole.js'
import { createRequireProviderAccess } from '../middleware/requireProviderAccess.js'
import { prepareSchema, vacancyCreateSchema, vacancyPatchSchema } from '../services/schemas.js'
import {
  createVacancy,
  deleteVacancy,
  getVacancy,
  listVacancies,
  patchVacancy,
} from '../services/vacancyService.js'
import { prepareInterview } from '../services/prepareInterview.js'

/**
 * /api/providers/:slug/vacancies
 * Усі ендпоінти проходять requireProviderAccess; provider_id береться з req.provider,
 * а не з тіла запиту. Запис доступний лише super_admin і provider_admin.
 */
export function createVacanciesRouter(db, jwtSecret, generator) {
  const router = Router({ mergeParams: true })
  const requireAdmin = createRequireRole(db)('super_admin', 'provider_admin')

  router.use(createRequireAuth(jwtSecret))
  router.use(createRequireProviderAccess(db))

  router.get('/', async (req, res, next) => {
    try {
      const vacancies = await listVacancies(db, req.provider.id)
      res.json({ vacancies })
    } catch (error) {
      next(error)
    }
  })

  router.post('/', requireAdmin, async (req, res, next) => {
    try {
      const parsed = vacancyCreateSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const vacancy = await createVacancy(db, req.user.id, req.provider.id, parsed.data, generator)
      res.status(201).json({ vacancy })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const vacancy = await getVacancy(db, req.params.id, req.provider.id)
      if (!vacancy) {
        res.status(404).json({ error: 'Vacancy not found' })
        return
      }
      res.json({ vacancy })
    } catch (error) {
      next(error)
    }
  })

  router.patch('/:id', requireAdmin, async (req, res, next) => {
    try {
      const parsed = vacancyPatchSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const vacancy = await patchVacancy(db, req.params.id, req.provider.id, parsed.data, generator)
      if (!vacancy) {
        res.status(404).json({ error: 'Vacancy not found' })
        return
      }
      res.json({ vacancy })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:id', requireAdmin, async (req, res, next) => {
    try {
      const deleted = await deleteVacancy(db, req.params.id, req.provider.id)
      if (!deleted) {
        res.status(404).json({ error: 'Vacancy not found' })
        return
      }
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  router.post('/:id/prepare', async (req, res, next) => {
    try {
      const parsed = prepareSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }

      const vacancy = await getVacancy(db, req.params.id, req.provider.id)
      if (!vacancy) {
        res.status(404).json({ error: 'Vacancy not found' })
        return
      }

      const prepared = await prepareInterview(vacancy, parsed.data, generator)
      res.json({
        vacancy,
        config: parsed.data,
        ...prepared,
      })
    } catch (error) {
      next(error)
    }
  })

  return router
}
