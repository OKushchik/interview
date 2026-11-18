import { HttpError } from '../lib/httpError.js'

export function toUserDto(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    providerId: row.providerId ?? null,
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

  let providerId = input.providerId !== undefined ? input.providerId : target.providerId
  if (role !== 'provider_admin') {
    providerId = null
  } else if (!providerId) {
    throw new HttpError(400, 'provider_admin requires providerId')
  }

  if (providerId) {
    const provider = await db.Provider.findOne({ where: { id: providerId } })
    if (!provider) throw new HttpError(404, 'Provider not found')
  }

  const updated = await db.User.update({ role, providerId }, { where: { id: target.id } })
  return toUserDto(updated)
}
