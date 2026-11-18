import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireRole } from '../middleware/requireRole.js'
import { createRequireProviderAccess } from '../middleware/requireProviderAccess.js'
import { accessGrantSchema } from '../services/schemas.js'
import { grantAccess, listProviderAccess, revokeAccess } from '../services/accessService.js'

/** /api/providers/:slug/access: super_admin (будь-яка компанія) і provider_admin (лише своя). */
export function createAccessRouter(db, jwtSecret) {
  const router = Router({ mergeParams: true })
  router.use(createRequireAuth(jwtSecret))
  router.use(createRequireRole(db)('super_admin', 'provider_admin'))
  router.use(createRequireProviderAccess(db))

  router.get('/', async (req, res, next) => {
    try {
      res.json({ access: await listProviderAccess(db, req.provider) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/', async (req, res, next) => {
    try {
      const parsed = accessGrantSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const created = await grantAccess(db, req.provider, parsed.data.userId)
      res.status(created ? 201 : 200).json({ ok: true })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:userId', async (req, res, next) => {
    try {
      const removed = await revokeAccess(db, req.provider, req.params.userId)
      if (!removed) {
        res.status(404).json({ error: 'Access not found' })
        return
      }
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  return router
}
