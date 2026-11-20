/**
 * Access levels of a provider_admin: Map<providerId, 'manage' | 'view'>.
 * The primary provider (users.provider_id) is always 'manage'; the rest come from user_provider_access.access_level.
 */
export async function adminProviderLevels(db, user) {
  const rows = await db.UserProviderAccess.findAll({ where: { userId: user.id } })
  const levels = new Map(rows.map((r) => [r.providerId, r.accessLevel === 'manage' ? 'manage' : 'view']))
  if (user.providerId) levels.set(user.providerId, 'manage')
  return levels
}

/** The user's access level to a provider: 'manage', 'view' or null (no access). */
export async function getProviderLevel(db, user, provider) {
  if (user.role === 'super_admin') return 'manage'
  if (user.role === 'provider_admin') return (await adminProviderLevels(db, user)).get(provider.id) ?? null
  if (user.role === 'user') {
    const row = await db.UserProviderAccess.findOne({ where: { userId: user.id, providerId: provider.id } })
    return row ? 'view' : null
  }
  return null
}

/** Whether the user has access to a provider (view or manage). */
export async function canAccessProvider(db, user, provider) {
  return (await getProviderLevel(db, user, provider)) !== null
}

/** Providers available to the user, with a canManage flag (for the select on the client). */
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
