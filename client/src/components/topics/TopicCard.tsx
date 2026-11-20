import { ArrowRight, Trash2 } from 'lucide-react'
import type { Topic } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface TopicCardProps {
  topic: Topic
  onOpen: (topic: Topic) => void
  /** Якщо передано, показується кнопка «Видалити» (лише для адмінів). */
  onDelete?: (topic: Topic) => void
}

export function TopicCard({ topic, onOpen, onDelete }: TopicCardProps) {
  const questionCount = topic.quizQuestions?.length ?? 0

  return (
    <Card hoverable onClick={() => onOpen(topic)} className="flex flex-col h-full">
      <h3 className="text-lg font-semibold text-text mb-3">{topic.title}</h3>
      <p className="text-sm text-muted mb-4 flex-grow line-clamp-4">{topic.description || topic.content}</p>

      <div className="mb-5">
        <Badge variant="primary">{questionCount > 0 ? `Тест: ${questionCount} питань` : 'Без тесту'}</Badge>
      </div>

      <Button className="w-full">
        Відкрити
        <ArrowRight size={16} />
      </Button>

      {onDelete && (
        <Button
          variant="danger"
          size="sm"
          className="mt-2 w-full"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(topic)
          }}
        >
          <Trash2 size={14} />
          Видалити
        </Button>
      )}
    </Card>
  )
}
