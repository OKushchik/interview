import { useEffect, useState } from 'react'
import type { VacancyFormData, InterviewConfig, SeniorityLevel } from '@/types'
import { InterviewConfigFields } from './InterviewConfigFields'
import { AVAILABLE_SKILLS, DEFAULT_INTERVIEW_CONFIG, SENIORITY_LEVEL_OPTIONS } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface CreateVacancyModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: (data: VacancyFormData) => void | Promise<void>
  isSubmitting?: boolean
  error?: string | null
  /** Початкові значення: режим редагування. */
  initial?: VacancyFormData | null
  heading?: string
  submitLabel?: string
}

export function CreateVacancyModal({
  isOpen,
  onClose,
  onNext,
  isSubmitting = false,
  error,
  initial = null,
  heading = 'Створити власну вакансію',
  submitLabel = 'Ок',
}: CreateVacancyModalProps) {
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<SeniorityLevel>('middle')
  const [skills, setSkills] = useState<string[]>([])
  const [configEnabled, setConfigEnabled] = useState(false)
  const [config, setConfig] = useState<InterviewConfig>(DEFAULT_INTERVIEW_CONFIG)

  // Форма заповнюється при відкритті (початкові значення або порожня) і очищається при закритті,
  // тому при помилці запиту введені дані не втрачаються.
  useEffect(() => {
    setTitle(isOpen ? initial?.title ?? '' : '')
    setLevel(isOpen ? initial?.level ?? 'middle' : 'middle')
    setSkills(isOpen ? initial?.skills ?? [] : [])
    setConfigEnabled(isOpen ? Boolean(initial?.interviewConfig) : false)
    // Старі збережені конфігурації можуть не мати codingCount, тому доповнюємо значеннями за замовчуванням.
    setConfig(isOpen ? { ...DEFAULT_INTERVIEW_CONFIG, ...initial?.interviewConfig } : DEFAULT_INTERVIEW_CONFIG)
  }, [isOpen, initial])

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || skills.length === 0) return
    void onNext({ title: title.trim(), level, skills, interviewConfig: configEnabled ? config : null })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={heading} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Назва вакансії"
          placeholder="Наприклад: Fullstack Developer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
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
                  level === l.value
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border text-muted hover:border-border-hover'
                }`}
              >
                <span className="text-lg">{l.emoji}</span>
                <p className="text-sm font-medium mt-1">{l.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-muted">
            Необхідні скіли (оберіть мінімум 1)
          </label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {AVAILABLE_SKILLS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className="transition-transform hover:scale-105"
              >
                <Badge variant={skills.includes(skill) ? 'cyan' : 'default'}>
                  {skill}
                </Badge>
              </button>
            ))}
          </div>
          {skills.length > 0 && (
            <p className="text-xs text-muted">Обрано: {skills.join(', ')}</p>
          )}
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={configEnabled}
              onChange={(e) => setConfigEnabled(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm font-medium text-text">Конфігурація співбесіди</span>
          </label>
          <p className="text-xs text-muted -mt-2">
            {configEnabled
              ? 'Усі користувачі проходитимуть співбесіду з цією конфігурацією.'
              : 'Кожен користувач налаштовуватиме конфігурацію сам.'}
          </p>
          {configEnabled && <InterviewConfigFields value={config} onChange={setConfig} />}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Скасувати</Button>
          <Button type="submit" disabled={isSubmitting || !title.trim() || skills.length === 0}>
            {isSubmitting ? 'Збереження…' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
