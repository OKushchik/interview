import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireRole } from '../middleware/requireRole.js'
import { userPatchSchema } from '../services/schemas.js'
import { deleteUser, listUsers, updateUser } from '../services/userService.js'

/** /api/users: user management (super_admin only). */
export function createUsersRouter(db, jwtSecret) {
  const router = Router()
  router.use(createRequireAuth(jwtSecret))
  router.use(createRequireRole(db)('super_admin'))

  router.get('/', async (_req, res, next) => {
    try {
      res.json({ users: await listUsers(db) })
    } catch (error) {
      next(error)
    }
  })

  router.patch('/:id', async (req, res, next) => {
    try {
      const parsed = userPatchSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      res.json({ user: await updateUser(db, req.user.id, req.params.id, parsed.data) })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:id', async (req, res, next) => {
    try {
      await deleteUser(db, req.user.id, req.params.id)
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  return router
}
