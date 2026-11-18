import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireRole } from '../middleware/requireRole.js'
import { companyCreateSchema, companyPatchSchema } from '../services/schemas.js'
import {
  createCompany,
  deleteCompany,
  listCompanies,
  toCompanyDto,
  updateCompany,
} from '../services/companyService.js'
import { listAccessibleCompanies } from '../services/companyAccess.js'

function badRequest(res, parsed) {
  res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
}

/** /api/companies: CRUD для super_admin і GET /mine для select. */
export function createCompaniesRouter(db, jwtSecret) {
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
      const companies = await listAccessibleCompanies(db, user)
      res.json({ companies: companies.map(toCompanyDto) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/', requireSuperAdmin, async (_req, res, next) => {
    try {
      res.json({ companies: await listCompanies(db) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/', requireSuperAdmin, async (req, res, next) => {
    try {
      const parsed = companyCreateSchema.safeParse(req.body)
      if (!parsed.success) return badRequest(res, parsed)
      res.status(201).json({ company: await createCompany(db, parsed.data) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:slug', requireSuperAdmin, async (req, res, next) => {
    try {
      const company = await db.Company.findOne({ where: { slug: req.params.slug } })
      if (!company) {
        res.status(404).json({ error: 'Company not found' })
        return
      }
      res.json({ company: toCompanyDto(company) })
    } catch (error) {
      next(error)
    }
  })

  router.patch('/:slug', requireSuperAdmin, async (req, res, next) => {
    try {
      const parsed = companyPatchSchema.safeParse(req.body)
      if (!parsed.success) return badRequest(res, parsed)
      const company = await db.Company.findOne({ where: { slug: req.params.slug } })
      if (!company) {
        res.status(404).json({ error: 'Company not found' })
        return
      }
      res.json({ company: await updateCompany(db, company, parsed.data) })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:slug', requireSuperAdmin, async (req, res, next) => {
    try {
      const company = await db.Company.findOne({ where: { slug: req.params.slug } })
      if (!company) {
        res.status(404).json({ error: 'Company not found' })
        return
      }
      await deleteCompany(db, company)
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  return router
}
