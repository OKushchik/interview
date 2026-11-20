import type { AdminUser, UserPatch } from '@/types'
import { apiRequest } from './api'

export const usersApi = {
  async list(): Promise<AdminUser[]> {
    const data = await apiRequest<{ users: AdminUser[] }>('/api/users')
    return data.users
  },
  async update(id: string, patch: UserPatch): Promise<AdminUser> {
    const data = await apiRequest<{ user: AdminUser }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    return data.user
  },
  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
