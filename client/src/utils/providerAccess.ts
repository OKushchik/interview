import type { AuthUser } from '@/types'

/** Whether the user can edit provider content (a provider_admin with view-only access cannot). */
export function canManageProvider(user: AuthUser | null | undefined, slug: string | undefined): boolean {
  if (!user || !slug) return false
  if (user.role === 'super_admin') return true
  if (user.role !== 'provider_admin') return false
  return user.accessibleProviders?.find((p) => p.slug === slug)?.canManage === true
}
