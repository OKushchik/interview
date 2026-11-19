import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { InterviewConfig, Vacancy } from '@/types'
import { DEFAULT_INTERVIEW_CONFIG, GENERATED_MAX } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { InterviewConfigFields } from './InterviewConfigFields'

const clamp = (value: number, max: number, min = 0) => Math.min(Math.max(value, min), max)

interface InterviewConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (config: InterviewConfig) => void
  isGenerating: boolean
  vacancy: Vacancy | null
  error?: string | null
}

export function InterviewConfigModal({
  isOpen,
  onClose,
  onStart,
  isGenerating,
  vacancy,
  error,
}: InterviewConfigModalProps) {
  const [config, setConfig] = useState<InterviewConfig>(DEFAULT_INTERVIEW_CONFIG)

  // Максимум — кількість питань цього типу, що збережені в БД для вакансії.
  const stored = config.type === 'quiz' ? vacancy?.quizQuestions : vacancy?.botQuestions
  const limits = {
    questions: stored?.length || GENERATED_MAX,
    coding: vacancy?.codingTasks?.length || GENERATED_MAX,
  }

  // При кожному відкритті форма починається з конфігурації вакансії (якщо є) або значень за замовчуванням.
  useEffect(() => {
    if (!isOpen) return
    setConfig({ ...DEFAULT_INTERVIEW_CONFIG, ...vacancy?.interviewConfig })
  }, [isOpen, vacancy])

  const questionCount = clamp(config.questionCount, limits.questions, 1)
  const codingCount = clamp(config.codingCount ?? 1, limits.coding, 1)
  const total = questionCount + (config.enableCoding ? codingCount : 0)
  const effective: InterviewConfig = { ...config, questionCount, codingCount }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Конфігурація співбесіди" size="xl">
      <p className="text-sm text-muted mb-6">
        Вакансія: <span className="text-text font-medium">{vacancy?.title ?? ''}</span>
      </p>

      <div className="space-y-6">
        <InterviewConfigFields value={effective} onChange={setConfig} limits={limits} />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isGenerating}>
            Назад
          </Button>
          <Button onClick={() => onStart(effective)} disabled={isGenerating || total === 0}>
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
