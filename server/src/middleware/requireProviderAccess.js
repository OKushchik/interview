import { canAccessProvider } from '../services/providerAccess.js'

/** Потребує попереднього requireAuth. За :slug знаходить компанію й перевіряє доступ; кладе її в req.provider. */
export function createRequireProviderAccess(db) {
  return async function requireProviderAccess(req, res, next) {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      const user = await db.User.findOne({ where: { id: req.user.id } })
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      const provider = await db.Provider.findOne({ where: { slug: req.params.slug } })
      if (!provider) {
        res.status(404).json({ error: 'Provider not found' })
        return
      }
      if (!(await canAccessProvider(db, user, provider))) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }
      req.user = { ...req.user, role: user.role, email: user.email, providerId: user.providerId ?? null }
      req.provider = provider
      next()
    } catch (error) {
      next(error)
    }
  }
}
