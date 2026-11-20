import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { providerPath, vacanciesPath } from '@/utils/paths'

/** `/` веде до першого доступного провайдера, а без провайдера до списку з мок-вакансіями. */
export function HomeRedirect() {
  const providers = useAuthStore((s) => s.user?.accessibleProviders)
  const first = providers?.[0]
  return <Navigate to={first ? providerPath(first.slug, 'vacancies') : vacanciesPath} replace />
}
