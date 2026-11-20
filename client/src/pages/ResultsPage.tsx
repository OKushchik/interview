import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { InterviewResultSummary, TeamResult } from '@/types'
import { testResultsApi } from '@/services/testResultsApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/utils/errors'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'

type Tab = 'interviews' | 'articles'

const TABS: { id: Tab; label: string }[] = [
  { id: 'interviews', label: 'Співбесіди' },
  { id: 'articles', label: 'Статті' },
]

const formatDate = (iso: string) => new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })
const MEDALS = ['🥇', '🥈', '🥉']

interface Column<T> {
  header: string
  align?: 'right'
  /** Значення для сортування; без нього стовпець не сортується. */
  sortValue?: (row: T) => string | number
  render: (row: T) => React.ReactNode
}

type SortDir = 'asc' | 'desc'

const DEFAULT_SORT_HEADER = 'Результат'

/**
 * Таблиця результатів з сортуванням по кліку на заголовок. Початково — за результатом від найкращих
 * (порядок від сервера: при рівних балах далі кількість правильних і дата). Медалі показуються лише в цьому порядку.
 */
function ResultsTable<T extends { id: string }>({ rows, columns }: { rows: T[]; columns: Column<T>[] }) {
  const [sort, setSort] = useState<{ header: string; dir: SortDir }>({ header: DEFAULT_SORT_HEADER, dir: 'desc' })
  const isDefault = sort.header === DEFAULT_SORT_HEADER && sort.dir === 'desc'

  const sorted = useMemo(() => {
    const column = columns.find((c) => c.header === sort.header)
    if (!column?.sortValue || isDefault) return rows
    const value = column.sortValue
    const factor = sort.dir === 'asc' ? 1 : -1
    // Стабільне сортування: рівні значення лишаються у порядку від сервера.
    return rows
      .map((row, index) => ({ row, index }))
      .sort((x, y) => {
        const a = value(x.row)
        const b = value(y.row)
        const cmp = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'uk')
        return cmp * factor || x.index - y.index
      })
      .map((x) => x.row)
  }, [rows, columns, sort, isDefault])

  const toggle = (c: Column<T>) =>
    setSort((prev) =>
      prev.header === c.header
        ? { header: c.header, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        // Числа й дати спершу від більшого/новішого, текст — за алфавітом.
        : { header: c.header, dir: c.align === 'right' || c.header === 'Дата' ? 'desc' : 'asc' },
    )

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted border-b border-border">
            <th className="px-4 py-3 font-medium w-12">#</th>
            {columns.map((c) => {
              const active = sort.header === c.header
              const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
              return (
                <th
                  key={c.header}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={`px-4 py-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggle(c)}
                      className={`inline-flex items-center gap-1 hover:text-text transition-colors ${active ? 'text-text' : ''}`}
                    >
                      {c.header}
                      <Icon size={14} className={active ? '' : 'opacity-50'} />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((row, i) => (
            <tr key={row.id}>
              <td className="px-4 py-3 text-muted">{isDefault ? (MEDALS[i] ?? i + 1) : i + 1}</td>
              {columns.map((c) => (
                <td key={c.header} className={`px-4 py-3 ${c.align === 'right' ? 'text-right whitespace-nowrap' : ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

const userCell = (r: { email: string | null }) => <span className="text-text">{r.email ?? '—'}</span>
const providerCell = (r: { providerName: string | null }) => <span className="text-muted">{r.providerName ?? '—'}</span>
const dateCell = (r: { createdAt: string }) => <span className="text-muted whitespace-nowrap">{formatDate(r.createdAt)}</span>

const INTERVIEW_COLUMNS: Column<InterviewResultSummary>[] = [
  { header: 'Користувач', sortValue: (r) => r.email ?? '', render: userCell },
  {
    header: 'Вакансія',
    sortValue: (r) => r.vacancyTitle,
    render: (r) => (
      <span className="text-text">
        {r.vacancyTitle}
        {r.level && <span className="text-xs text-muted ml-2">{r.level}</span>}
      </span>
    ),
  },
  { header: 'Провайдер', sortValue: (r) => r.providerName ?? '', render: providerCell },
  { header: 'Результат', align: 'right', sortValue: (r) => r.score, render: (r) => <span className="font-semibold gradient-text">{r.score}%</span> },
  { header: 'Дата', sortValue: (r) => new Date(r.createdAt).getTime(), render: dateCell },
]

const ARTICLE_COLUMNS: Column<TeamResult>[] = [
  { header: 'Користувач', sortValue: (r) => r.email ?? '', render: userCell },
  { header: 'Тема', sortValue: (r) => r.topicTitle, render: (r) => <span className="text-text">{r.topicTitle}</span> },
  { header: 'Провайдер', sortValue: (r) => r.providerName ?? '', render: providerCell },
  {
    header: 'Результат',
    align: 'right',
    sortValue: (r) => r.score,
    render: (r) => (
      <>
        <span className="font-semibold gradient-text">{r.score}%</span>
        <span className="text-xs text-muted ml-2">{r.correctCount} з {r.total}</span>
      </>
    ),
  },
  { header: 'Дата', sortValue: (r) => new Date(r.createdAt).getTime(), render: dateCell },
]

/** Вкладка «Результати» (адміни): результати співбесід і статей користувачів по провайдерах адміна, від найкращих. */
export function ResultsPage() {
  const authUser = useAuthStore((s) => s.user)
  const providers = useMemo(
    () => (authUser?.accessibleProviders ?? []).filter((p) => authUser?.role === 'super_admin' || p.canManage),
    [authUser],
  )
  const [tab, setTab] = useState<Tab>('interviews')
  const [providerId, setProviderId] = useState('')
  const [interviews, setInterviews] = useState<InterviewResultSummary[] | null>(null)
  const [articles, setArticles] = useState<TeamResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setError(null)
    setInterviews(null)
    setArticles(null)
    const filter = providerId || undefined
    const onError = (e: unknown) => {
      if (!cancelled) setError(getErrorMessage(e, 'Не вдалося завантажити результати'))
    }
    if (tab === 'interviews') {
      testResultsApi.listTeamInterviews(filter).then((rows) => !cancelled && setInterviews(rows), onError)
    } else {
      testResultsApi.listTeam(filter).then((rows) => !cancelled && setArticles(rows), onError)
    }
    return () => {
      cancelled = true
    }
  }, [tab, providerId])

  const options = [{ value: '', label: 'Усі провайдери' }, ...providers.map((p) => ({ value: p.id, label: p.name }))]
  const rows = tab === 'interviews' ? interviews : articles

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Результати</h1>
            <p className="text-sm text-muted">Результати користувачів, від найкращих.</p>
          </div>
          {providers.length > 1 && (
            <div className="sm:w-64">
              <Select aria-label="Провайдер" value={providerId} options={options} onChange={(e) => setProviderId(e.target.value)} />
            </div>
          )}
        </div>

        <div role="tablist" className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-primary/15 text-text border border-primary/40' : 'text-muted hover:text-text hover:bg-hover'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400">{error}</p>}
        {!error && !rows && <p className="text-muted">Завантаження…</p>}
        {rows?.length === 0 && <p className="text-muted">Результатів поки немає.</p>}
        {tab === 'interviews' && interviews && interviews.length > 0 && <ResultsTable key={`i-${providerId}`} rows={interviews} columns={INTERVIEW_COLUMNS} />}
        {tab === 'articles' && articles && articles.length > 0 && <ResultsTable key={`a-${providerId}`} rows={articles} columns={ARTICLE_COLUMNS} />}
      </main>
    </div>
  )
}
