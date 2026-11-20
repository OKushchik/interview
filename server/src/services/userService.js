import { HttpError } from '../lib/httpError.js'
import { adminProviderLevels } from './providerAccess.js'

function idsByLevel(row, levels, level) {
  const map = levels ?? new Map(row.providerId ? [[row.providerId, 'manage']] : [])
  return [...map].filter(([, l]) => l === level).map(([id]) => id)
}

export function toUserDto(row, levels) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    providerId: row.providerId ?? null,
    // provider_admin: providerIds — де може редагувати, viewProviderIds — лише перегляд; для інших ролей — [].
    providerIds: row.role === 'provider_admin' ? idsByLevel(row, levels, 'manage') : [],
    viewProviderIds: row.role === 'provider_admin' ? idsByLevel(row, levels, 'view') : [],
    isGuest: Boolean(row.isGuest),
    emailVerified: Boolean(row.emailVerified),
    createdAt: row.createdAt,
  }
}

export async function listUsers(db) {
  const rows = await db.User.findAll({ order: [['createdAt', 'DESC']] })
  const access = await db.UserProviderAccess.findAll()
  const byUser = new Map()
  for (const a of access) {
    const levels = byUser.get(a.userId) ?? new Map()
    levels.set(a.providerId, a.accessLevel === 'manage' ? 'manage' : 'view')
    byUser.set(a.userId, levels)
  }
  return rows.map((row) => {
    const levels = new Map(byUser.get(row.id) ?? [])
    if (row.providerId) levels.set(row.providerId, 'manage')
    return toUserDto(row, levels)
  })
}

/** Зміна ролі та/або прив'язки до компанії. Лише для super_admin (перевіряється в роуті). */
export async function updateUser(db, actorId, targetId, input) {
  const target = await db.User.findOne({ where: { id: targetId } })
  if (!target) throw new HttpError(404, 'User not found')
  if (target.isGuest) throw new HttpError(400, 'Guest account cannot be changed')

  const role = input.role ?? target.role
  if (target.id === actorId && role !== 'super_admin') {
    throw new HttpError(400, 'You cannot change your own role')
  }

  // Для provider_admin: providerIds — керування (перший основний), viewProviderIds — лише перегляд.
  let levels = new Map()
  if (role === 'provider_admin') {
    const current = await adminProviderLevels(db, target)
    const manage = input.providerIds ?? (input.providerId !== undefined ? (input.providerId ? [input.providerId] : []) : [...current].filter(([, l]) => l === 'manage').map(([id]) => id))
    const view = input.viewProviderIds ?? [...current].filter(([, l]) => l === 'view').map(([id]) => id)
    for (const id of view) levels.set(id, 'view')
    for (const id of manage) levels.set(id, 'manage') // manage перекриває view
    if (manage.length === 0) throw new HttpError(400, 'provider_admin requires at least one provider to manage')
    const found = await db.Provider.findAll({ where: { id: [...levels.keys()] } })
    if (found.length !== levels.size) throw new HttpError(404, 'Provider not found')
    levels = new Map([...[...new Set(manage)].map((id) => [id, 'manage']), ...[...levels].filter(([, l]) => l === 'view')])
  }
  const providerId = [...levels].find(([, l]) => l === 'manage')?.[0] ?? null

  const wasProviderAdmin = target.role === 'provider_admin'
  const updated = await db.User.update({ role, providerId }, { where: { id: target.id } })

  // Доступи синхронізуємо, лише коли користувач є/стає/перестає бути provider_admin:
  // звичайні доступи ролі user (user_provider_access) не чіпаємо.
  if (role === 'provider_admin' || wasProviderAdmin) {
    await db.UserProviderAccess.destroy({ where: { userId: target.id } })
    for (const [id, accessLevel] of levels) await db.UserProviderAccess.create({ userId: target.id, providerId: id, accessLevel })
  }
  return toUserDto(updated, levels)
}

/** Видалення користувача разом з його вакансіями та доступами. Лише для super_admin (перевіряється в роуті). */
export async function deleteUser(db, actorId, targetId) {
  const target = await db.User.findOne({ where: { id: targetId } })
  if (!target) throw new HttpError(404, 'User not found')
  if (target.id === actorId) throw new HttpError(400, 'You cannot delete your own account')

  await db.UserProviderAccess.destroy({ where: { userId: target.id } })
  await db.Vacancy.destroy({ where: { userId: target.id } })
  await db.User.destroy({ where: { id: target.id } })
}
