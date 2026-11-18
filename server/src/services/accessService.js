import { HttpError } from '../lib/httpError.js'

export async function listProviderAccess(db, provider) {
  const rows = await db.UserProviderAccess.findAll({ where: { providerId: provider.id } })
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
export async function grantAccess(db, provider, userId) {
  const user = await db.User.findOne({ where: { id: userId } })
  if (!user) throw new HttpError(404, 'User not found')
  if (user.role !== 'user' || user.isGuest) {
    throw new HttpError(400, 'Access can be granted only to regular users')
  }
  const existing = await db.UserProviderAccess.findOne({ where: { userId, providerId: provider.id } })
  if (existing) return false
  await db.UserProviderAccess.create({ userId, providerId: provider.id })
  return true
}

export async function revokeAccess(db, provider, userId) {
  const existing = await db.UserProviderAccess.findOne({ where: { userId, providerId: provider.id } })
  if (!existing) return false
  await db.UserProviderAccess.destroy({ where: { userId, providerId: provider.id } })
  return true
}
