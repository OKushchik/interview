export function createRequireAdmin(db) {
  return async function requireAdmin(req, res, next) {
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
      if (user.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden' })
        return
      }
      req.user = { ...req.user, role: user.role, email: user.email }
      next()
    } catch (error) {
      next(error)
    }
  }
}
