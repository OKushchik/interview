import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireAdmin } from '../middleware/requireAdmin.js'
import { prepareSchema, vacancyCreateSchema, vacancyPatchSchema } from '../services/schemas.js'
import {
  createVacancy,
  deleteVacancy,
  getVacancy,
  listVacancies,
  patchVacancy,
} from '../services/vacancyService.js'
import { prepareInterview } from '../services/prepareInterview.js'

export function createVacanciesRouter(db, jwtSecret, generator) {
  const router = Router()
  const requireAuth = createRequireAuth(jwtSecret)
  const requireAdmin = createRequireAdmin(db)

  router.use(requireAuth)

  router.get('/', async (req, res, next) => {
    try {
      const vacancies = await listVacancies(db)
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
      const vacancy = await createVacancy(db, req.user.id, parsed.data)
      res.status(201).json({ vacancy })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const vacancy = await getVacancy(db, req.params.id)
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
      const vacancy = await patchVacancy(db, req.params.id, parsed.data)
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
      const deleted = await deleteVacancy(db, req.params.id)
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

      const vacancy = await getVacancy(db, req.params.id)
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
