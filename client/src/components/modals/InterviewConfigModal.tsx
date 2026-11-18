import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { InterviewConfig } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DEFAULT_INTERVIEW_CONFIG, InterviewConfigFields } from './InterviewConfigFields'

interface InterviewConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (config: InterviewConfig) => void
  isGenerating: boolean
  vacancyTitle: string
  error?: string | null
}

export function InterviewConfigModal({
  isOpen,
  onClose,
  onStart,
  isGenerating,
  vacancyTitle,
  error,
}: InterviewConfigModalProps) {
  const [config, setConfig] = useState<InterviewConfig>(DEFAULT_INTERVIEW_CONFIG)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Конфігурація співбесіди" size="xl">
      <p className="text-sm text-muted mb-6">
        Вакансія: <span className="text-text font-medium">{vacancyTitle}</span>
      </p>

      <div className="space-y-6">
        <InterviewConfigFields value={config} onChange={setConfig} />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isGenerating}>
            Назад
          </Button>
          <Button onClick={() => onStart(config)} disabled={isGenerating}>
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
