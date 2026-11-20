/** Шлях списку вакансій без провайдера (мок-дані). */
export const vacanciesPath = '/vacancies'

/** Клієнтські маршрути провайдера: /provider/<slug>/<section>. */
export function providerPath(slug: string, section: 'vacancies' | 'interview' | 'access' | 'topics'): string {
  return `/provider/${encodeURIComponent(slug)}/${section}`
}

/** Розділ «Аналіз статей» без провайдера (немає доступних провайдерів). */
export const topicsPath = '/topics'

/** Сторінка теми: /provider/<slug>/topics/<id>. */
export function topicPath(slug: string, id: string): string {
  return `${providerPath(slug, 'topics')}/${encodeURIComponent(id)}`
}
