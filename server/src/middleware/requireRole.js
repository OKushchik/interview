export function createRequireRole(db) {
  return function requireRole(...roles) {
    return async function requireRoleMiddleware(req, res, next) {
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
        if (!roles.includes(user.role)) {
          res.status(403).json({ error: 'Forbidden' })
          return
        }
        req.user = { ...req.user, role: user.role, email: user.email, companyId: user.companyId ?? null }
        next()
      } catch (error) {
        next(error)
      }
    }
  }
}
