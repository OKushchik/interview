import { useState } from 'react'
import { Target, Bot, Loader2 } from 'lucide-react'
import type { InterviewConfig, InterviewType } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Slider } from '@/components/ui/Slider'
import { Toggle } from '@/components/ui/Toggle'
import { Button } from '@/components/ui/Button'

interface InterviewConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (config: InterviewConfig) => void
  isGenerating: boolean
  vacancyTitle: string
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

export function InterviewConfigModal({
  isOpen,
  onClose,
  onStart,
  isGenerating,
  vacancyTitle,
}: InterviewConfigModalProps) {
  const [type, setType] = useState<InterviewType>('quiz')
  const [questionCount, setQuestionCount] = useState(10)
  const [enableCoding, setEnableCoding] = useState(false)

  const handleStart = () => {
    onStart({ type, questionCount, enableCoding })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Конфігурація співбесіди" size="xl">
      <p className="text-sm text-muted mb-6">
        Вакансія: <span className="text-text font-medium">{vacancyTitle}</span>
      </p>

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
                  onClick={() => setType(t.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    type === t.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border-hover'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon size={20} className={type === t.value ? 'text-primary' : 'text-muted'} />
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
          value={questionCount}
          min={5}
          max={20}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
        />

        <Toggle
          label="Онлайн кодинг"
          description="Додати секцію з написанням коду"
          checked={enableCoding}
          onChange={setEnableCoding}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isGenerating}>
            Назад
          </Button>
          <Button onClick={handleStart} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Генерація питань...
              </>
            ) : (
              '🚀 Розпочати співбесіду'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
