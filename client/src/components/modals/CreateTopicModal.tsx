import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, FileUp, Loader2, PenLine, Sparkles } from 'lucide-react'
import type { QuizDraft, TopicCreateMode, TopicCreateStep, TopicFormData } from '@/types'
import { TEXTAREA_CLASS, TOPIC_CONTENT_MAX, TOPIC_QUESTION_COUNT_DEFAULT } from '@/types'
import { EMPTY_FACTORIES, isDraftComplete, isDraftEmpty } from '@/utils/manualVacancy'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { QuizDraftsEditor } from '@/components/topics/QuizDraftsEditor'

interface CreateTopicModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TopicFormData) => void | Promise<void>
  isSubmitting?: boolean
  error?: string | null
}

/**
 * Topic creation. Two paths:
 *  1) AI: title + description -> AI writes the text and generates questions;
 *  2) own text (paste or file) -> questions from AI or custom.
 */
export function CreateTopicModal({ isOpen, onClose, onSubmit, isSubmitting = false, error }: CreateTopicModalProps) {
  const [step, setStep] = useState<TopicCreateStep>('mode')
  const [mode, setMode] = useState<TopicCreateMode>('ai')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [questionCount, setQuestionCount] = useState(TOPIC_QUESTION_COUNT_DEFAULT)
  const [manual, setManual] = useState(false)
  const [drafts, setDrafts] = useState<QuizDraft[]>(() => [EMPTY_FACTORIES.quiz()])
  const [localError, setLocalError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) return
    setStep('mode')
    setMode('ai')
    setTitle('')
    setDescription('')
    setContent('')
    setQuestionCount(TOPIC_QUESTION_COUNT_DEFAULT)
    setManual(false)
    setDrafts([EMPTY_FACTORIES.quiz()])
    setLocalError(null)
  }, [isOpen])

  const shownError = localError ?? error ?? null
  const countField = (
    <Input
      label="Кількість питань для тесту (1–20)"
      type="number"
      min={1}
      max={20}
      value={questionCount}
      onChange={(e) => setQuestionCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
    />
  )

  const chooseMode = (next: TopicCreateMode) => {
    setMode(next)
    setStep('text')
  }

  const handleFile = async (file: File) => {
    try {
      const text = (await file.text()).trim()
      if (text.length > TOPIC_CONTENT_MAX) {
        setLocalError(`Файл завеликий: максимум ${TOPIC_CONTENT_MAX} символів`)
        return
      }
      setContent(text)
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''))
      setLocalError(null)
    } catch {
      setLocalError('Не вдалося прочитати файл')
    }
  }

  const handleTextNext = () => {
    setLocalError(null)
    if (!title.trim()) {
      setLocalError('Вкажіть назву теми')
      return
    }
    if (mode === 'ai') {
      void onSubmit({ title: title.trim(), description: description.trim(), content: '', questionCount, generateQuestions: true })
      return
    }
    if (!content.trim()) {
      setLocalError('Вставте текст або завантажте файл')
      return
    }
    setStep('questions')
  }

  const submitOwn = (data: Partial<TopicFormData>) =>
    onSubmit({ title: title.trim(), description: description.trim(), content: content.trim(), ...data })

  const handleManualSave = () => {
    const filled = drafts.filter((d) => !isDraftEmpty('quiz', d))
    if (filled.length === 0 || filled.some((d) => !isDraftComplete('quiz', d))) {
      setLocalError('Заповніть питання та всі 4 варіанти відповіді (або видаліть порожні питання)')
      return
    }
    setLocalError(null)
    void submitOwn({ quizQuestions: filled.map((d) => ({ ...d, question: d.question.trim(), options: d.options.map((o) => o.trim()) })) })
  }

  const back = () => {
    setLocalError(null)
    if (manual) setManual(false)
    else setStep(step === 'questions' ? 'text' : 'mode')
  }

  const heading = step === 'mode' ? 'Нова тема' : mode === 'ai' ? 'Тема з AI' : 'Власний текст'

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title={heading} size="xl">
      {step === 'mode' && (
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => chooseMode('ai')}
            className="p-5 rounded-xl border border-border text-left hover:border-primary/50 transition-colors"
          >
            <Sparkles size={22} className="text-primary mb-3" />
            <p className="font-semibold text-text mb-1">Згенерувати через AI</p>
            <p className="text-sm text-muted">Вкажіть назву й опис — AI напише текст і підготує тест.</p>
          </button>
          <button
            type="button"
            onClick={() => chooseMode('own')}
            className="p-5 rounded-xl border border-border text-left hover:border-primary/50 transition-colors"
          >
            <PenLine size={22} className="text-cyan mb-3" />
            <p className="font-semibold text-text mb-1">Власний текст</p>
            <p className="text-sm text-muted">Вставте текст або завантажте файл, далі створіть питання.</p>
          </button>
        </div>
      )}

      {step === 'text' && (
        <div className="space-y-4">
          <Input label="Назва теми" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр.: Event Loop у JavaScript" />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">Опис{mode === 'own' ? ' (необов’язково)' : ''}</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={mode === 'ai' ? 'Що саме розкрити в тексті' : 'Короткий опис для картки'}
              className={TEXTAREA_CLASS}
            />
          </div>

          {mode === 'ai' ? (
            countField
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-muted">Текст</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file) void handleFile(file)
                  }}
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                  <FileUp size={14} />
                  Завантажити файл
                </Button>
              </div>
              <textarea
                rows={10}
                value={content}
                maxLength={TOPIC_CONTENT_MAX}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Вставте текст статті або завантажте .txt / .md файл"
                className={TEXTAREA_CLASS}
              />
            </div>
          )}

          {shownError && <p className="text-sm text-red-400">{shownError}</p>}
          <div className="flex justify-between gap-3">
            <Button variant="ghost" onClick={back} disabled={isSubmitting}>
              <ChevronLeft size={16} />
              Назад
            </Button>
            <Button onClick={handleTextNext} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Генерація…
                </>
              ) : mode === 'ai' ? (
                'Створити тему'
              ) : (
                'Далі'
              )}
            </Button>
          </div>
        </div>
      )}

      {step === 'questions' && !manual && (
        <div className="space-y-4">
          <p className="text-sm text-muted">Як підготувати тест для теми «{title}»?</p>
          {countField}
          {shownError && <p className="text-sm text-red-400">{shownError}</p>}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="flex-1" disabled={isSubmitting} onClick={() => void submitOwn({ questionCount, generateQuestions: true })}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Генерація…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Згенерувати питання за допомогою AI
                </>
              )}
            </Button>
            <Button className="flex-1" variant="secondary" disabled={isSubmitting} onClick={() => { setLocalError(null); setManual(true) }}>
              <PenLine size={16} />
              Створити власні питання
            </Button>
          </div>
          <Button variant="ghost" onClick={back} disabled={isSubmitting}>
            <ChevronLeft size={16} />
            Назад
          </Button>
        </div>
      )}

      {step === 'questions' && manual && (
        <div className="space-y-4">
          <QuizDraftsEditor drafts={drafts} onChange={setDrafts} />
          {shownError && <p className="text-sm text-red-400">{shownError}</p>}
          <div className="flex justify-between gap-3">
            <Button variant="ghost" onClick={back} disabled={isSubmitting}>
              <ChevronLeft size={16} />
              Назад
            </Button>
            <Button onClick={handleManualSave} disabled={isSubmitting}>
              {isSubmitting ? 'Збереження…' : 'Створити тему'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
