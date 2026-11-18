import type { AccessEntry, AccessGrant } from '@/types'
import { apiRequest } from './api'

const base = (slug: string) => `/api/providers/${encodeURIComponent(slug)}/access`

export const accessApi = {
  async list(slug: string): Promise<AccessEntry[]> {
    const data = await apiRequest<{ access: AccessEntry[] }>(base(slug))
    return data.access
  },
  async grant(slug: string, target: AccessGrant): Promise<void> {
    await apiRequest<{ ok: boolean }>(base(slug), {
      method: 'POST',
      body: JSON.stringify(target),
    })
  },
  async revoke(slug: string, userId: string): Promise<void> {
    await apiRequest<void>(`${base(slug)}/${encodeURIComponent(userId)}`, { method: 'DELETE' })
  },
}
