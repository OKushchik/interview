import { HttpError } from '../lib/httpError.js'

export async function listCompanyAccess(db, company) {
  const rows = await db.UserCompanyAccess.findAll({ where: { companyId: company.id } })
  if (rows.length === 0) return []
  const users = await db.User.findAll({ where: { id: rows.map((r) => r.userId) } })
  const byId = new Map(users.map((u) => [u.id, u]))
  return rows
    .filter((r) => byId.has(r.userId))
    .map((r) => ({
      userId: r.userId,
      email: byId.get(r.userId).email,
      createdAt: r.createdAt,
    }))
}

/** Видає доступ (ідемпотентно). Повертає true, якщо запис створено. */
export async function grantAccess(db, company, userId) {
  const user = await db.User.findOne({ where: { id: userId } })
  if (!user) throw new HttpError(404, 'User not found')
  if (user.role !== 'user' || user.isGuest) {
    throw new HttpError(400, 'Access can be granted only to regular users')
  }
  const existing = await db.UserCompanyAccess.findOne({ where: { userId, companyId: company.id } })
  if (existing) return false
  await db.UserCompanyAccess.create({ userId, companyId: company.id })
  return true
}

export async function revokeAccess(db, company, userId) {
  const existing = await db.UserCompanyAccess.findOne({ where: { userId, companyId: company.id } })
  if (!existing) return false
  await db.UserCompanyAccess.destroy({ where: { userId, companyId: company.id } })
  return true
}
