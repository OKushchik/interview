import { HttpError } from '../lib/httpError.js'

export function toProviderDto(row) {
  return { id: row.id, name: row.name, slug: row.slug, createdAt: row.createdAt }
}

async function assertSlugFree(db, slug, exceptId) {
  const existing = await db.Provider.findOne({ where: { slug } })
  if (existing && existing.id !== exceptId) {
    throw new HttpError(409, 'Provider slug already exists')
  }
}

export async function listProviders(db) {
  const rows = await db.Provider.findAll({ order: [['name', 'ASC']] })
  return rows.map(toProviderDto)
}

export async function createProvider(db, input) {
  await assertSlugFree(db, input.slug)
  return toProviderDto(await db.Provider.create({ name: input.name, slug: input.slug }))
}

export async function updateProvider(db, provider, input) {
  if (input.slug !== undefined) await assertSlugFree(db, input.slug, provider.id)
  const values = {}
  if (input.name !== undefined) values.name = input.name
  if (input.slug !== undefined) values.slug = input.slug
  return toProviderDto(await db.Provider.update(values, { where: { id: provider.id } }))
}

export async function deleteProvider(db, provider) {
  await db.Provider.destroy({ where: { id: provider.id } })
}
