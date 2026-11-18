import type { Provider, ProviderFormData } from '@/types'
import { apiRequest } from './api'

export const providersApi = {
  async list(): Promise<Provider[]> {
    const data = await apiRequest<{ providers: Provider[] }>('/api/providers')
    return data.providers
  },
  async create(form: ProviderFormData): Promise<Provider> {
    const data = await apiRequest<{ provider: Provider }>('/api/providers', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    return data.provider
  },
}
