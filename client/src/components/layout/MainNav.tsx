import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Briefcase, FileText, Trophy } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { analysisPath, providerPath, resultsPath, topicsPath, vacanciesPath } from '@/utils/paths'

const LINK_BASE = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors'

/** Перемикач розділів: вакансії / аналіз статей. */
export function MainNav() {
  const isGuest = useAuthStore((s) => Boolean(s.user?.isGuest))
  const isAdmin = useAuthStore((s) => s.user?.role === 'super_admin' || s.user?.role === 'provider_admin')
  const first = useAuthStore((s) => s.user?.accessibleProviders?.[0])
  const vacanciesTo = first ? providerPath(first.slug, 'vacancies') : vacanciesPath
  const topicsTo = first ? providerPath(first.slug, 'topics') : topicsPath

  const { pathname } = useLocation()
  const inTopics = pathname.startsWith(topicsPath) || /^\/provider\/[^/]+\/topics/.test(pathname)
  const inVacancies = /^(\/vacancies|\/provider\/[^/]+\/(vacancies|interview))/.test(pathname) || pathname === '/interview'

  const inAnalysis = pathname === analysisPath
  const inResults = pathname === resultsPath

  const linkClass = (active: boolean) =>
    `${LINK_BASE} ${active ? 'bg-primary/15 text-text border border-primary/40' : 'text-muted hover:text-text hover:bg-hover'}`

  return (
    <nav className="flex gap-2" aria-label="Розділи">
      <Link to={vacanciesTo} className={linkClass(inVacancies)}>
        <Briefcase size={16} />
        Вакансії
      </Link>
      <Link to={topicsTo} className={linkClass(inTopics)}>
        <FileText size={16} />
        Статті
      </Link>
      {!isGuest && (
        <Link to={analysisPath} className={linkClass(inAnalysis)}>
          <BarChart3 size={16} />
          Аналіз
        </Link>
      )}
      {isAdmin && (
        <Link to={resultsPath} className={linkClass(inResults)}>
          <Trophy size={16} />
          Результати
        </Link>
      )}
    </nav>
  )
}
