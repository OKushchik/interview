import type { Topic, TopicFormData, TopicUpdateData } from '@/types'
import { apiRequest } from './api'

const base = (slug: string) => `/api/providers/${encodeURIComponent(slug)}/topics`

export const topicsApi = {
  async list(slug: string): Promise<Topic[]> {
    const data = await apiRequest<{ topics: Topic[] }>(base(slug))
    return data.topics
  },
  async get(slug: string, id: string): Promise<Topic> {
    const data = await apiRequest<{ topic: Topic }>(`${base(slug)}/${encodeURIComponent(id)}`)
    return data.topic
  },
  async create(slug: string, form: TopicFormData): Promise<Topic> {
    const data = await apiRequest<{ topic: Topic }>(base(slug), {
      method: 'POST',
      body: JSON.stringify(form),
    })
    return data.topic
  },
  async update(slug: string, id: string, form: TopicUpdateData): Promise<Topic> {
    const data = await apiRequest<{ topic: Topic }>(`${base(slug)}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(form),
    })
    return data.topic
  },
  async remove(slug: string, id: string): Promise<void> {
    await apiRequest<void>(`${base(slug)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
