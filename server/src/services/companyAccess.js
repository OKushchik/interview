/** Чи має користувач доступ до компанії. super_admin — завжди; company_admin — лише своя; user — за user_company_access. */
export async function canAccessCompany(db, user, company) {
  if (user.role === 'super_admin') return true
  if (user.role === 'company_admin') return Boolean(user.companyId) && user.companyId === company.id
  if (user.role === 'user') {
    const row = await db.UserCompanyAccess.findOne({ where: { userId: user.id, companyId: company.id } })
    return Boolean(row)
  }
  return false
}

/** Компанії, доступні користувачу (для select на клієнті). */
export async function listAccessibleCompanies(db, user) {
  if (user.role === 'super_admin') {
    return db.Company.findAll({ order: [['name', 'ASC']] })
  }
  if (user.role === 'company_admin') {
    if (!user.companyId) return []
    const company = await db.Company.findOne({ where: { id: user.companyId } })
    return company ? [company] : []
  }
  const rows = await db.UserCompanyAccess.findAll({ where: { userId: user.id } })
  if (rows.length === 0) return []
  return db.Company.findAll({ where: { id: rows.map((r) => r.companyId) }, order: [['name', 'ASC']] })
}
