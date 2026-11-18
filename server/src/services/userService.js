import { HttpError } from '../lib/httpError.js'

export function toUserDto(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    companyId: row.companyId ?? null,
    isGuest: Boolean(row.isGuest),
    emailVerified: Boolean(row.emailVerified),
    createdAt: row.createdAt,
  }
}

export async function listUsers(db) {
  const rows = await db.User.findAll({ order: [['createdAt', 'DESC']] })
  return rows.map(toUserDto)
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

  let companyId = input.companyId !== undefined ? input.companyId : target.companyId
  if (role !== 'company_admin') {
    companyId = null
  } else if (!companyId) {
    throw new HttpError(400, 'company_admin requires companyId')
  }

  if (companyId) {
    const company = await db.Company.findOne({ where: { id: companyId } })
    if (!company) throw new HttpError(404, 'Company not found')
  }

  const updated = await db.User.update({ role, companyId }, { where: { id: target.id } })
  return toUserDto(updated)
}
