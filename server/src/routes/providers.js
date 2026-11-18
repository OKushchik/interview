import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireRole } from '../middleware/requireRole.js'
import { providerCreateSchema, providerPatchSchema } from '../services/schemas.js'
import {
  createProvider,
  deleteProvider,
  listProviders,
  toProviderDto,
  updateProvider,
} from '../services/providerService.js'
import { listAccessibleProviders } from '../services/providerAccess.js'

function badRequest(res, parsed) {
  res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
}

/** /api/providers: CRUD для super_admin і GET /mine для select. */
export function createProvidersRouter(db, jwtSecret) {
  const router = Router()
  const requireSuperAdmin = createRequireRole(db)('super_admin')

  router.use(createRequireAuth(jwtSecret))

  router.get('/mine', async (req, res, next) => {
    try {
      const user = await db.User.findOne({ where: { id: req.user.id } })
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      const providers = await listAccessibleProviders(db, user)
      res.json({ providers: providers.map(toProviderDto) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/', requireSuperAdmin, async (_req, res, next) => {
    try {
      res.json({ providers: await listProviders(db) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/', requireSuperAdmin, async (req, res, next) => {
    try {
      const parsed = providerCreateSchema.safeParse(req.body)
      if (!parsed.success) return badRequest(res, parsed)
      res.status(201).json({ provider: await createProvider(db, parsed.data) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:slug', requireSuperAdmin, async (req, res, next) => {
    try {
      const provider = await db.Provider.findOne({ where: { slug: req.params.slug } })
      if (!provider) {
        res.status(404).json({ error: 'Provider not found' })
        return
      }
      res.json({ provider: toProviderDto(provider) })
    } catch (error) {
      next(error)
    }
  })

  router.patch('/:slug', requireSuperAdmin, async (req, res, next) => {
    try {
      const parsed = providerPatchSchema.safeParse(req.body)
      if (!parsed.success) return badRequest(res, parsed)
      const provider = await db.Provider.findOne({ where: { slug: req.params.slug } })
      if (!provider) {
        res.status(404).json({ error: 'Provider not found' })
        return
      }
      res.json({ provider: await updateProvider(db, provider, parsed.data) })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:slug', requireSuperAdmin, async (req, res, next) => {
    try {
      const provider = await db.Provider.findOne({ where: { slug: req.params.slug } })
      if (!provider) {
        res.status(404).json({ error: 'Provider not found' })
        return
      }
      await deleteProvider(db, provider)
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  return router
}
