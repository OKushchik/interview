/** Шлях списку вакансій без провайдера (мок-дані). */
export const vacanciesPath = '/vacancies'

/** Клієнтські маршрути провайдера: /provider/<slug>/<section>. */
export function providerPath(slug: string, section: 'vacancies' | 'interview' | 'access'): string {
  return `/provider/${encodeURIComponent(slug)}/${section}`
}

/** Розділ «Аналіз статей»: список тем і сторінка теми. */
export const topicsPath = '/topics'

export function topicPath(id: string): string {
  return `${topicsPath}/${encodeURIComponent(id)}`
}
