/** Шлях списку вакансій без провайдера (мок-дані). */
export const vacanciesPath = '/vacancies'

/** Клієнтські маршрути провайдера: /provider/<slug>/<section>. */
export function providerPath(slug: string, section: 'vacancies' | 'interview' | 'access'): string {
  return `/provider/${encodeURIComponent(slug)}/${section}`
}
