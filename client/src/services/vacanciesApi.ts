import type { Vacancy, VacancyFormData } from '@/types'
import { apiRequest } from './api'

const base = (slug: string) => `/api/providers/${encodeURIComponent(slug)}/vacancies`

export const vacanciesApi = {
  async list(slug: string): Promise<Vacancy[]> {
    const data = await apiRequest<{ vacancies: Vacancy[] }>(base(slug))
    return data.vacancies
  },
  async create(slug: string, form: VacancyFormData): Promise<Vacancy> {
    const data = await apiRequest<{ vacancy: Vacancy }>(base(slug), {
      method: 'POST',
      body: JSON.stringify(form),
    })
    return data.vacancy
  },
  async update(slug: string, id: string, form: VacancyFormData): Promise<Vacancy> {
    const data = await apiRequest<{ vacancy: Vacancy }>(`${base(slug)}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(form),
    })
    return data.vacancy
  },
  async remove(slug: string, id: string): Promise<void> {
    await apiRequest<void>(`${base(slug)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
