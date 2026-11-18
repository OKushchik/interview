/** Чи має користувач доступ до компанії. super_admin — завжди; provider_admin — лише своя; user — за user_provider_access. */
export async function canAccessProvider(db, user, provider) {
  if (user.role === 'super_admin') return true
  if (user.role === 'provider_admin') return Boolean(user.providerId) && user.providerId === provider.id
  if (user.role === 'user') {
    const row = await db.UserProviderAccess.findOne({ where: { userId: user.id, providerId: provider.id } })
    return Boolean(row)
  }
  return false
}

/** Компанії, доступні користувачу (для select на клієнті). */
export async function listAccessibleProviders(db, user) {
  if (user.role === 'super_admin') {
    return db.Provider.findAll({ order: [['name', 'ASC']] })
  }
  if (user.role === 'provider_admin') {
    if (!user.providerId) return []
    const provider = await db.Provider.findOne({ where: { id: user.providerId } })
    return provider ? [provider] : []
  }
  const rows = await db.UserProviderAccess.findAll({ where: { userId: user.id } })
  if (rows.length === 0) return []
  return db.Provider.findAll({ where: { id: rows.map((r) => r.providerId) }, order: [['name', 'ASC']] })
}
