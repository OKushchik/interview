import type { Topic, TopicFormData } from '@/types'
import { apiRequest } from './api'

export const topicsApi = {
  async list(): Promise<Topic[]> {
    const data = await apiRequest<{ topics: Topic[] }>('/api/topics')
    return data.topics
  },
  async get(id: string): Promise<Topic> {
    const data = await apiRequest<{ topic: Topic }>(`/api/topics/${encodeURIComponent(id)}`)
    return data.topic
  },
  async create(form: TopicFormData): Promise<Topic> {
    const data = await apiRequest<{ topic: Topic }>('/api/topics', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    return data.topic
  },
  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/api/topics/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
