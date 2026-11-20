import type { AuthUser } from '@/types'

/** Чи може користувач редагувати вміст провайдера (provider_admin з доступом «лише перегляд» — ні). */
export function canManageProvider(user: AuthUser | null | undefined, slug: string | undefined): boolean {
  if (!user || !slug) return false
  if (user.role === 'super_admin') return true
  if (user.role !== 'provider_admin') return false
  return user.accessibleProviders?.find((p) => p.slug === slug)?.canManage === true
}
