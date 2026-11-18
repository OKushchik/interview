import { canAccessCompany } from '../services/companyAccess.js'

/** Потребує попереднього requireAuth. За :slug знаходить компанію й перевіряє доступ; кладе її в req.company. */
export function createRequireCompanyAccess(db) {
  return async function requireCompanyAccess(req, res, next) {
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
      const company = await db.Company.findOne({ where: { slug: req.params.slug } })
      if (!company) {
        res.status(404).json({ error: 'Company not found' })
        return
      }
      if (!(await canAccessCompany(db, user, company))) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }
      req.user = { ...req.user, role: user.role, email: user.email, companyId: user.companyId ?? null }
      req.company = company
      next()
    } catch (error) {
      next(error)
    }
  }
}
