import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { providerPath, vacanciesPath } from '@/utils/paths'

/** `/` leads to the first available provider, and without a provider to the list with mock vacancies. */
export function HomeRedirect() {
  const providers = useAuthStore((s) => s.user?.accessibleProviders)
  const first = providers?.[0]
  return <Navigate to={first ? providerPath(first.slug, 'vacancies') : vacanciesPath} replace />
}
