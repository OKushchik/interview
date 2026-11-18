import { Target, Bot } from 'lucide-react'
import type { InterviewConfig, InterviewType } from '@/types'
import { Slider } from '@/components/ui/Slider'
import { Toggle } from '@/components/ui/Toggle'

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
  type: 'quiz',
  questionCount: 10,
  enableCoding: false,
}

const TYPES: { value: InterviewType; label: string; description: string; icon: typeof Target }[] = [
  {
    value: 'quiz',
    label: 'Quiz (Тести)',
    description: 'Питання з 4 варіантами відповідей',
    icon: Target,
  },
  {
    value: 'bot',
    label: 'Online Bot',
    description: 'Вільна форма з текстом або голосом',
    icon: Bot,
  },
]

interface InterviewConfigFieldsProps {
  value: InterviewConfig
  onChange: (value: InterviewConfig) => void
}

/** Поля конфігурації співбесіди: тип, кількість питань, онлайн кодинг. */
export function InterviewConfigFields({ value, onChange }: InterviewConfigFieldsProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="block text-sm font-medium text-muted">Тип співбесіди</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TYPES.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange({ ...value, type: t.value })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  value.type === t.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-border-hover'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon size={20} className={value.type === t.value ? 'text-primary' : 'text-muted'} />
                  <span className="font-medium text-text">{t.label}</span>
                </div>
                <p className="text-xs text-muted">{t.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <Slider
        label="Кількість питань"
        value={value.questionCount}
        min={5}
        max={20}
        onChange={(e) => onChange({ ...value, questionCount: Number(e.target.value) })}
      />

      <Toggle
        label="Онлайн кодинг"
        description="Додати секцію з написанням коду"
        checked={value.enableCoding}
        onChange={(enableCoding) => onChange({ ...value, enableCoding })}
      />
    </div>
  )
}
