import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Pencil, XCircle } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { Topic, TopicUpdateData } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { EditTopicModal } from '@/components/modals/EditTopicModal'
import { topicsApi } from '@/services/topicsApi'
import { ApiError } from '@/services/api'
import { providerPath, topicsPath } from '@/utils/paths'
import { Header } from '@/components/layout/Header'
import { QuizInterview } from '@/components/interview/QuizInterview'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

type View = 'text' | 'quiz' | 'result'

/** Сторінка теми: текст, тест і результат (результат не зберігається). */
export function TopicPage() {
  const { slug, id } = useParams()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('text')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const role = useAuthStore((s) => s.user?.role)
  const canManage = role === 'super_admin' || role === 'provider_admin'
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug || !id) return
    let cancelled = false
    topicsApi
      .get(slug, id)
      .then((t) => {
        if (!cancelled) setTopic(t)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError && e.status === 404 ? 'Тему не знайдено' : 'Не вдалося завантажити тему')
      })
    return () => {
      cancelled = true
    }
  }, [slug, id])

  const handleSave = async (form: TopicUpdateData) => {
    if (!slug || !id) return
    setSaving(true)
    setSaveError(null)
    try {
      setTopic(await topicsApi.update(slug, id, form))
      setEditing(false)
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Не вдалося зберегти тему')
    } finally {
      setSaving(false)
    }
  }

  const questions = topic?.quizQuestions ?? []
  const correctCount = questions.filter((q) => answers[q.id] === q.correctIndex).length
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0

  const startQuiz = () => {
    setAnswers({})
    setView('quiz')
  }

  const renderBody = () => {
    if (error) return <p className="text-center text-red-400">{error}</p>
    if (!topic) return <p className="text-center text-muted">Завантаження…</p>

    if (view === 'quiz') {
      return (
        <QuizInterview
          questions={questions}
          answers={answers}
          onAnswer={(questionId, selectedIndex) => setAnswers((prev) => ({ ...prev, [questionId]: selectedIndex }))}
          onComplete={() => setView('result')}
        />
      )
    }

    if (view === 'result') {
      return (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="text-center">
            <p className="text-sm text-muted mb-2">Результат тесту</p>
            <p className="text-5xl font-bold gradient-text mb-2">{score}%</p>
            <p className="text-muted">Правильних відповідей: {correctCount} з {questions.length}</p>
          </Card>

          {questions.map((q, index) => {
            const selected = answers[q.id]
            const ok = selected === q.correctIndex
            return (
              <Card key={q.id}>
                <div className="flex items-start gap-3">
                  {ok ? <CheckCircle2 className="text-emerald shrink-0" size={20} /> : <XCircle className="text-red-400 shrink-0" size={20} />}
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-text">{index + 1}. {q.question}</p>
                    <p className="text-muted">Ваша відповідь: {q.options[selected] ?? 'Без відповіді'}</p>
                    {!ok && <p className="text-emerald">Правильна відповідь: {q.options[q.correctIndex]}</p>}
                    {q.explanation && <p className="text-muted">{q.explanation}</p>}
                  </div>
                </div>
              </Card>
            )
          })}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setView('text')}>До тексту</Button>
            <Button onClick={startQuiz}>Пройти ще раз</Button>
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold gradient-text mb-3">{topic.title}</h2>
            {topic.description && <p className="text-muted">{topic.description}</p>}
          </div>
          {canManage && (
            <Button variant="secondary" size="sm" onClick={() => { setSaveError(null); setEditing(true) }}>
              <Pencil size={14} />
              Редагувати
            </Button>
          )}
        </div>
        <Card>
          <div className="text-text whitespace-pre-wrap leading-relaxed">{topic.content}</div>
        </Card>
        {questions.length > 0 ? (
          <div className="flex justify-end">
            <Button size="lg" onClick={startQuiz}>Пройти тестування</Button>
          </div>
        ) : (
          <p className="text-sm text-muted text-right">Для цієї теми тест ще не створено.</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to={slug ? providerPath(slug, 'topics') : topicsPath} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text mb-6">
          <ArrowLeft size={16} />
          До списку тем
        </Link>
        {renderBody()}
      </main>
      {canManage && topic && (
        <EditTopicModal
          topic={topic}
          isOpen={editing}
          onClose={() => setEditing(false)}
          onSubmit={handleSave}
          isSubmitting={saving}
          error={saveError}
        />
      )}
    </div>
  )
}
