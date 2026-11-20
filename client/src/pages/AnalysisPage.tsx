import { useEffect, useState } from 'react'
import { CheckCircle2, ChevronDown, XCircle } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import type { OwnInterviewResult, TestResult } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { testResultsApi } from '@/services/testResultsApi'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'

type Tab = 'interviews' | 'articles'

const TABS: { id: Tab; label: string }[] = [
  { id: 'interviews', label: 'Співбесіди' },
  { id: 'articles', label: 'Статті' },
]

const formatDate = (iso: string) => new Date(iso).toLocaleString('uk-UA', { dateStyle: 'medium', timeStyle: 'short' })

/** Loads the list once on the first open of the tab. */
function useResults<T>(load: () => Promise<T[]>, enabled: boolean) {
  const [results, setResults] = useState<T[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || results) return
    let cancelled = false
    load()
      .then((r) => {
        if (!cancelled) setResults(r)
      })
      .catch(() => {
        if (!cancelled) setError('Не вдалося завантажити результати')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return { results, error }
}

function ArticleResults({ results }: { results: TestResult[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <>
      {results.map((r) => {
        const open = openId === r.id
        return (
          <Card key={r.id}>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-4 text-left"
              onClick={() => setOpenId(open ? null : r.id)}
              aria-expanded={open}
            >
              <div>
                <p className="font-medium text-text">{r.topicTitle}</p>
                <p className="text-xs text-muted">
                  {r.providerName ? `${r.providerName} · ` : ''}
                  {formatDate(r.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xl font-bold gradient-text">{r.score}%</p>
                  <p className="text-xs text-muted">{r.correctCount} з {r.total}</p>
                </div>
                <ChevronDown size={18} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {open && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                {r.details.map((d, i) => {
                  const ok = d.selectedIndex === d.correctIndex
                  return (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      {ok ? <CheckCircle2 className="text-emerald shrink-0" size={18} /> : <XCircle className="text-red-400 shrink-0" size={18} />}
                      <div className="space-y-1">
                        <p className="font-medium text-text">{i + 1}. {d.question}</p>
                        <p className="text-muted">
                          Ваша відповідь: {d.selectedIndex === null ? 'Без відповіді' : d.options[d.selectedIndex]}
                        </p>
                        {!ok && <p className="text-emerald">Правильна відповідь: {d.options[d.correctIndex]}</p>}
                        {d.explanation && <p className="text-muted">{d.explanation}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}
    </>
  )
}

function InterviewResults({ results }: { results: OwnInterviewResult[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <>
      {results.map((r) => {
        const open = openId === r.id
        const { summary, strengths = [], weaknesses = [] } = r.report ?? {}
        return (
          <Card key={r.id}>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-4 text-left"
              onClick={() => setOpenId(open ? null : r.id)}
              aria-expanded={open}
            >
              <div>
                <p className="font-medium text-text">
                  {r.vacancyTitle}
                  {r.level && <span className="text-xs text-muted ml-2">{r.level}</span>}
                </p>
                <p className="text-xs text-muted">
                  {r.providerName ? `${r.providerName} · ` : ''}
                  {formatDate(r.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-xl font-bold gradient-text">{r.score}%</p>
                <ChevronDown size={18} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {open && (
              <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                {summary && <p className="text-muted">{summary}</p>}
                {strengths.length > 0 && (
                  <div>
                    <p className="font-medium text-emerald mb-1">Сильні сторони</p>
                    <ul className="list-disc pl-5 text-muted space-y-1">
                      {strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {weaknesses.length > 0 && (
                  <div>
                    <p className="font-medium text-red-400 mb-1">Що покращити</p>
                    <ul className="list-disc pl-5 text-muted space-y-1">
                      {weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </>
  )
}

/** 'Analysis' tab: history of own results - interviews and article tests. */
export function AnalysisPage() {
  const isGuest = useAuthStore((s) => Boolean(s.user?.isGuest))
  const [tab, setTab] = useState<Tab>('interviews')
  const interviews = useResults(testResultsApi.listInterviews, tab === 'interviews' && !isGuest)
  const articles = useResults(testResultsApi.list, tab === 'articles' && !isGuest)
  const current = tab === 'interviews' ? interviews : articles

  // A guest has no results: a direct link navigation leads to the home page.
  if (isGuest) return <Navigate to="/" replace />

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-2xl font-bold gradient-text">Аналіз</h1>

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

        {current.error && <p className="text-red-400">{current.error}</p>}
        {!current.error && !current.results && <p className="text-muted">Завантаження…</p>}
        {current.results?.length === 0 && (
          <p className="text-muted">{tab === 'interviews' ? 'Ви ще не проходили співбесід.' : 'Ви ще не проходили тестів.'}</p>
        )}
        {/* List - a narrow column pinned to the left edge (like the rest of the page content). */}
        <div className="max-w-3xl space-y-6">
          {tab === 'interviews' && interviews.results && <InterviewResults results={interviews.results} />}
          {tab === 'articles' && articles.results && <ArticleResults results={articles.results} />}
        </div>
      </main>
    </div>
  )
}
