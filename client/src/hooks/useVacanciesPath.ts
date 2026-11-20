import { useAuthStore } from '@/store/authStore'
import { useInterviewStore } from '@/store/interviewStore'
import { providerPath, vacanciesPath } from '@/utils/paths'

/** Path to the vacancy list for the current session: provider's or the mock list without a provider. */
export function useVacanciesPath(): string {
  const providers = useAuthStore((s) => s.user?.accessibleProviders)
  const providerId = useInterviewStore((s) => s.currentSession?.vacancy.providerId)
  const slug = providers?.find((p) => p.id === providerId)?.slug
  return slug ? providerPath(slug, 'vacancies') : vacanciesPath
}
