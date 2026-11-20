import { HttpError } from '../lib/httpError.js'

export async function listProviderAccess(db, provider) {
  // Лише доступи «перегляд»: адміни з правом редагування (manage) керуються super_admin і тут не показуються.
  const rows = (await db.UserProviderAccess.findAll({ where: { providerId: provider.id } })).filter(
    (r) => r.accessLevel !== 'manage',
  )
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
export async function grantAccess(db, provider, target) {
  const user = await db.User.findOne({
    where: 'userId' in target ? { id: target.userId } : { email: target.email },
  })
  if (!user) throw new HttpError(404, 'User not found')
  // Перегляд можна дати звичайному користувачу або адміну іншого провайдера (provider_admin).
  if (!['user', 'provider_admin'].includes(user.role) || user.isGuest) {
    throw new HttpError(400, 'Access can be granted only to regular users or provider admins')
  }
  if (user.role === 'provider_admin' && user.providerId === provider.id) {
    throw new HttpError(400, 'User already manages this provider')
  }
  const existing = await db.UserProviderAccess.findOne({ where: { userId: user.id, providerId: provider.id } })
  if (existing) return false
  await db.UserProviderAccess.create({ userId: user.id, providerId: provider.id, accessLevel: 'view' })
  return true
}

export async function revokeAccess(db, provider, userId) {
  const existing = await db.UserProviderAccess.findOne({ where: { userId, providerId: provider.id } })
  // Право редагування (manage) через сторінку доступів не відкликається.
  if (!existing || existing.accessLevel === 'manage') return false
  await db.UserProviderAccess.destroy({ where: { userId, providerId: provider.id } })
  return true
}
