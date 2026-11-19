import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { BotDraft, CodingDraft, ManualDrafts, ManualSection, QuizDraft, ManualStep, SeniorityLevel, Vacancy, VacancyFormData } from '@/types'
import { AVAILABLE_SKILLS, MANUAL_SECTIONS, MANUAL_SECTION_LABELS, SENIORITY_LEVEL_OPTIONS, TEXTAREA_CLASS } from '@/types'
import {
  EMPTY_FACTORIES, cleanDrafts, createEmptyDrafts, draftsFromVacancy, findPartialIndex, isDraftComplete, isDraftEmpty,
} from '@/utils/manualVacancy'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface ManualVacancyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: VacancyFormData) => void | Promise<void>
  isSubmitting?: boolean
  error?: string | null
  /** Вакансія для редагування; без неї степер створює нову. */
  initial?: Vacancy | null
  heading?: string
  submitLabel?: string
}

const STEPS: ManualStep[] = ['details', ...MANUAL_SECTIONS]

/** Степер створення вакансії вручну: деталі → питання Quiz → питання Bot → Coding Task. */
export function ManualVacancyModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  error,
  initial = null,
  heading = 'Створити власну вакансію',
  submitLabel = 'Створити вакансію',
}: ManualVacancyModalProps) {
  const [step, setStep] = useState<ManualStep>('details')
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<SeniorityLevel>('middle')
  const [skills, setSkills] = useState<string[]>([])
  const [drafts, setDrafts] = useState<ManualDrafts>(createEmptyDrafts)
  const [index, setIndex] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    // Заповнюється при відкритті (дані вакансії або порожньо) і скидається при закритті.
    const source = isOpen ? initial : null
    setStep('details')
    setTitle(source?.title ?? '')
    setLevel(source?.level ?? 'middle')
    setSkills(source?.skills ?? [])
    setDrafts(source ? draftsFromVacancy(source) : createEmptyDrafts())
    setIndex(0)
    setLocalError(null)
  }, [isOpen, initial])

  const section: ManualSection | null = step === 'details' ? null : step
  const list = section ? drafts[section] : []
  const current = section ? list[index] : null
  const isLastSection = section === MANUAL_SECTIONS[MANUAL_SECTIONS.length - 1]
  const stepNumber = STEPS.indexOf(step) + 1

  const toggleSkill = (skill: string) =>
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))

  const updateCurrent = (patch: object) => {
    if (!section) return
    setLocalError(null)
    setDrafts((prev) => ({
      ...prev,
      [section]: prev[section].map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }))
  }

  const goToStep = (target: ManualStep) => {
    setLocalError(null)
    setStep(target)
    setIndex(0)
  }

  const handleBack = () => {
    setLocalError(null)
    if (index > 0) {
      setIndex(index - 1)
      return
    }
    const prev = STEPS[STEPS.indexOf(step) - 1]
    if (!prev) return
    setStep(prev)
    setIndex(prev === 'details' ? 0 : drafts[prev].length - 1)
  }

  const handleNextQuestion = () => {
    if (!section || !current) return
    if (!isDraftComplete(section, current)) {
      setLocalError('Заповніть усі поля поточного питання')
      return
    }
    setLocalError(null)
    if (index === list.length - 1) {
      setDrafts((prev) => ({ ...prev, [section]: [...prev[section], EMPTY_FACTORIES[section]()] }))
    }
    setIndex(index + 1)
  }

  /** Перевіряє секцію: порожні питання відкидаються, частково заповнене — помилка. */
  const finishSection = (): ManualDrafts | null => {
    if (!section) return drafts
    const partial = findPartialIndex(section, list)
    if (partial >= 0) {
      setIndex(partial)
      setLocalError('Заповніть питання повністю або очистіть його')
      return null
    }
    const kept = list.filter((d) => !isDraftEmpty(section, d))
    const next = { ...drafts, [section]: kept.length ? kept : [EMPTY_FACTORIES[section]()] }
    setDrafts(next)
    return next
  }

  const handleContinue = () => {
    if (step === 'details') {
      if (!title.trim() || skills.length === 0) return
      goToStep('quiz')
      return
    }
    const next = finishSection()
    if (!next) return
    if (isLastSection) {
      const cleaned = cleanDrafts(next)
      void onSubmit({
        title: title.trim(),
        level,
        skills,
        interviewConfig: null,
        quizQuestions: cleaned.quiz.length ? cleaned.quiz : null,
        botQuestions: cleaned.bot.length ? cleaned.bot : null,
        codingTasks: cleaned.coding.length ? cleaned.coding : null,
      })
      return
    }
    goToStep(STEPS[STEPS.indexOf(step) + 1])
  }

  const renderDetails = () => (
    <div className="space-y-6">
      <Input
        label="Назва вакансії"
        placeholder="Наприклад: Fullstack Developer"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="space-y-3">
        <label className="block text-sm font-medium text-muted">Рівень (Seniority)</label>
        <div className="grid grid-cols-3 gap-3">
          {SENIORITY_LEVEL_OPTIONS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLevel(l.value)}
              className={`p-3 rounded-xl border text-center transition-all ${
                level === l.value ? 'border-primary bg-primary/10 text-text' : 'border-border text-muted hover:border-border-hover'
              }`}
            >
              <span className="text-lg">{l.emoji}</span>
              <p className="text-sm font-medium mt-1">{l.label}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-muted">Необхідні скіли (оберіть мінімум 1)</label>
        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
          {AVAILABLE_SKILLS.map((skill) => (
            <button key={skill} type="button" onClick={() => toggleSkill(skill)} className="transition-transform hover:scale-105">
              <Badge variant={skills.includes(skill) ? 'cyan' : 'default'}>{skill}</Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderQuestion = () => {
    if (!current || !section) return null
    if (section === 'quiz') {
      const quiz = current as QuizDraft
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">Питання</label>
            <textarea
              rows={3}
              className={TEXTAREA_CLASS}
              value={quiz.question}
              onChange={(e) => updateCurrent({ question: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">Варіанти відповіді (позначте вірний)</label>
            {quiz.options.map((option, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correct-option"
                  checked={quiz.correctIndex === i}
                  onChange={() => updateCurrent({ correctIndex: i })}
                  className="w-4 h-4 accent-primary shrink-0"
                  aria-label={`Вірна відповідь ${i + 1}`}
                />
                <input
                  className={TEXTAREA_CLASS}
                  placeholder={`Варіант ${i + 1}`}
                  value={option}
                  onChange={(e) => updateCurrent({ options: quiz.options.map((o, j) => (j === i ? e.target.value : o)) })}
                />
              </div>
            ))}
          </div>
        </div>
      )
    }
    if (section === 'coding') {
      const task = current as CodingDraft
      return (
        <div className="space-y-4">
          <Input label="Назва завдання" value={task.title} onChange={(e) => updateCurrent({ title: e.target.value })} />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">Опис</label>
            <textarea
              rows={4}
              className={TEXTAREA_CLASS}
              value={task.description}
              onChange={(e) => updateCurrent({ description: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-muted">Початковий код (необов&apos;язково)</label>
            <textarea
              rows={5}
              className={`${TEXTAREA_CLASS} font-mono text-sm`}
              value={task.starterCode}
              onChange={(e) => updateCurrent({ starterCode: e.target.value })}
            />
          </div>
        </div>
      )
    }
    const bot = current as BotDraft
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted">Питання</label>
        <textarea
          rows={4}
          className={TEXTAREA_CLASS}
          value={bot.question}
          onChange={(e) => updateCurrent({ question: e.target.value })}
        />
      </div>
    )
  }

  const shownError = localError ?? error

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title={heading} size="xl">
      <p className="text-xs text-muted mb-4">
        Крок {stepNumber} з {STEPS.length}:{' '}
        {section ? `${MANUAL_SECTION_LABELS[section]} — питання ${index + 1} з ${list.length}` : 'Деталі вакансії'}
      </p>

      {step === 'details' ? renderDetails() : renderQuestion()}

      {section && (
        <p className="text-xs text-muted mt-4">
          Якщо залишити секцію порожньою й натиснути «Далі», її в співбесіді не буде.
        </p>
      )}
      {shownError && <p className="text-sm text-red-400 mt-4">{shownError}</p>}

      <div className="flex flex-wrap justify-between gap-3 pt-6">
        <Button type="button" variant="ghost" onClick={step === 'details' ? onClose : handleBack} disabled={isSubmitting}>
          {step !== 'details' && <ChevronLeft size={16} />}
          {step === 'details' ? 'Скасувати' : 'Назад'}
        </Button>
        <div className="flex gap-3">
          {section && (
            <Button type="button" variant="secondary" onClick={handleNextQuestion} disabled={isSubmitting}>
              <Plus size={16} />
              Наступне питання
            </Button>
          )}
          <Button
            type="button"
            onClick={handleContinue}
            disabled={isSubmitting || (step === 'details' && (!title.trim() || skills.length === 0))}
          >
            {isSubmitting ? 'Збереження…' : isLastSection ? submitLabel : 'Далі'}
            {!isSubmitting && !isLastSection && <ChevronRight size={16} />}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
