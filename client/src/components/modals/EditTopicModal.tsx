import { useEffect, useState } from 'react'
import type { QuizDraft, Topic, TopicUpdateData } from '@/types'
import { TEXTAREA_CLASS, TOPIC_CONTENT_MAX } from '@/types'
import { EMPTY_FACTORIES, isDraftComplete, isDraftEmpty } from '@/utils/manualVacancy'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { QuizDraftsEditor } from '@/components/topics/QuizDraftsEditor'

interface EditTopicModalProps {
  topic: Topic
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TopicUpdateData) => void | Promise<void>
  isSubmitting?: boolean
  error?: string | null
}

const draftsFromTopic = (topic: Topic): QuizDraft[] => {
  const drafts = (topic.quizQuestions ?? []).map((q) => ({
    question: q.question,
    options: [...q.options],
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }))
  return drafts.length ? drafts : [EMPTY_FACTORIES.quiz()]
}

/** Topic editing: title, description, text and test questions. */
export function EditTopicModal({ topic, isOpen, onClose, onSubmit, isSubmitting = false, error }: EditTopicModalProps) {
  const [title, setTitle] = useState(topic.title)
  const [description, setDescription] = useState(topic.description)
  const [content, setContent] = useState(topic.content)
  const [drafts, setDrafts] = useState<QuizDraft[]>(() => draftsFromTopic(topic))
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setTitle(topic.title)
    setDescription(topic.description)
    setContent(topic.content)
    setDrafts(draftsFromTopic(topic))
    setLocalError(null)
  }, [isOpen, topic])

  const handleSave = () => {
    if (!title.trim()) {
      setLocalError('Вкажіть назву теми')
      return
    }
    if (!content.trim()) {
      setLocalError('Текст теми не може бути порожнім')
      return
    }
    const filled = drafts.filter((d) => !isDraftEmpty('quiz', d))
    if (filled.some((d) => !isDraftComplete('quiz', d))) {
      setLocalError('Заповніть питання та всі 4 варіанти відповіді (або видаліть порожні питання)')
      return
    }
    setLocalError(null)
    void onSubmit({
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      quizQuestions: filled.length
        ? filled.map((d) => ({ ...d, question: d.question.trim(), options: d.options.map((o) => o.trim()) }))
        : null,
    })
  }

  const shownError = localError ?? error ?? null

  return (
    <Modal isOpen={isOpen} onClose={() => !isSubmitting && onClose()} title="Редагувати тему" size="xl">
      <div className="space-y-4">
        <Input label="Назва теми" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted">Опис</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={TEXTAREA_CLASS} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted">Текст</label>
          <textarea
            rows={12}
            value={content}
            maxLength={TOPIC_CONTENT_MAX}
            onChange={(e) => setContent(e.target.value)}
            className={TEXTAREA_CLASS}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-muted">Питання тесту</label>
          <QuizDraftsEditor drafts={drafts} onChange={setDrafts} />
        </div>

        {shownError && <p className="text-sm text-red-400">{shownError}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Збереження…' : 'Зберегти'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
