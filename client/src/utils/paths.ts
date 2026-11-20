/** Vacancy list path without a provider (mock data). */
export const vacanciesPath = '/vacancies'

/** Client routes of a provider: /provider/<slug>/<section>. */
export function providerPath(slug: string, section: 'vacancies' | 'interview' | 'access' | 'topics'): string {
  return `/provider/${encodeURIComponent(slug)}/${section}`
}

/** 'Articles' section without a provider (no providers available). */
export const topicsPath = '/topics'

/** Topic page: /provider/<slug>/topics/<id>. */
export function topicPath(slug: string, id: string): string {
  return `${providerPath(slug, 'topics')}/${encodeURIComponent(id)}`
}

/** 'Results' tab for admins: user results across their providers. */
export const resultsPath = '/results'

/** 'Analysis' tab: the user's test results. */
export const analysisPath = '/analysis'
