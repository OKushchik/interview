import { HttpError } from '../lib/httpError.js'

export function toCompanyDto(row) {
  return { id: row.id, name: row.name, slug: row.slug, createdAt: row.createdAt }
}

async function assertSlugFree(db, slug, exceptId) {
  const existing = await db.Company.findOne({ where: { slug } })
  if (existing && existing.id !== exceptId) {
    throw new HttpError(409, 'Company slug already exists')
  }
}

export async function listCompanies(db) {
  const rows = await db.Company.findAll({ order: [['name', 'ASC']] })
  return rows.map(toCompanyDto)
}

export async function createCompany(db, input) {
  await assertSlugFree(db, input.slug)
  return toCompanyDto(await db.Company.create({ name: input.name, slug: input.slug }))
}

export async function updateCompany(db, company, input) {
  if (input.slug !== undefined) await assertSlugFree(db, input.slug, company.id)
  const values = {}
  if (input.name !== undefined) values.name = input.name
  if (input.slug !== undefined) values.slug = input.slug
  return toCompanyDto(await db.Company.update(values, { where: { id: company.id } }))
}

export async function deleteCompany(db, company) {
  await db.Company.destroy({ where: { id: company.id } })
}
