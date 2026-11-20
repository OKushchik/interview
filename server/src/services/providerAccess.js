/**
 * Рівні доступу провайдера provider_admin: Map<providerId, 'manage' | 'view'>.
 * Основний провайдер (users.provider_id) — завжди 'manage'; решта — із user_provider_access.access_level.
 */
export async function adminProviderLevels(db, user) {
  const rows = await db.UserProviderAccess.findAll({ where: { userId: user.id } })
  const levels = new Map(rows.map((r) => [r.providerId, r.accessLevel === 'manage' ? 'manage' : 'view']))
  if (user.providerId) levels.set(user.providerId, 'manage')
  return levels
}

/** Рівень доступу користувача до компанії: 'manage', 'view' або null (доступу немає). */
export async function getProviderLevel(db, user, provider) {
  if (user.role === 'super_admin') return 'manage'
  if (user.role === 'provider_admin') return (await adminProviderLevels(db, user)).get(provider.id) ?? null
  if (user.role === 'user') {
    const row = await db.UserProviderAccess.findOne({ where: { userId: user.id, providerId: provider.id } })
    return row ? 'view' : null
  }
  return null
}

/** Чи має користувач доступ до компанії (перегляд або керування). */
export async function canAccessProvider(db, user, provider) {
  return (await getProviderLevel(db, user, provider)) !== null
}

/** Компанії, доступні користувачу, з прапорцем canManage (для select на клієнті). */
export async function listAccessibleProviders(db, user) {
  if (user.role === 'super_admin') {
    const all = await db.Provider.findAll({ order: [['name', 'ASC']] })
    return all.map((p) => ({ ...p, canManage: true }))
  }
  if (user.role === 'provider_admin') {
    const levels = await adminProviderLevels(db, user)
    if (levels.size === 0) return []
    const list = await db.Provider.findAll({ where: { id: [...levels.keys()] }, order: [['name', 'ASC']] })
    return list.map((p) => ({ ...p, canManage: levels.get(p.id) === 'manage' }))
  }
  const rows = await db.UserProviderAccess.findAll({ where: { userId: user.id } })
  if (rows.length === 0) return []
  const list = await db.Provider.findAll({ where: { id: rows.map((r) => r.providerId) }, order: [['name', 'ASC']] })
  return list.map((p) => ({ ...p, canManage: false }))
}
