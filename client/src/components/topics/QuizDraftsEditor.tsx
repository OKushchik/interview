import { Plus, Trash2 } from 'lucide-react'
import type { QuizDraft } from '@/types'
import { TEXTAREA_CLASS } from '@/types'
import { EMPTY_FACTORIES } from '@/utils/manualVacancy'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface QuizDraftsEditorProps {
  drafts: QuizDraft[]
  onChange: (drafts: QuizDraft[]) => void
}

/** Редактор власних тестових питань (4 варіанти, один правильний). */
export function QuizDraftsEditor({ drafts, onChange }: QuizDraftsEditorProps) {
  const patch = (index: number, change: Partial<QuizDraft>) =>
    onChange(drafts.map((d, i) => (i === index ? { ...d, ...change } : d)))

  const setOption = (index: number, optionIndex: number, value: string) =>
    patch(index, { options: drafts[index].options.map((o, i) => (i === optionIndex ? value : o)) })

  return (
    <div className="space-y-4">
      {drafts.map((draft, index) => (
        <div key={index} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted">Питання {index + 1}</span>
            {drafts.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(drafts.filter((_, i) => i !== index))}
                className="p-1.5 rounded-lg text-muted hover:text-red-400 hover:bg-hover-strong transition-colors"
                aria-label="Видалити питання"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <textarea
            rows={2}
            value={draft.question}
            onChange={(e) => patch(index, { question: e.target.value })}
            placeholder="Текст питання"
            className={TEXTAREA_CLASS}
          />
          {draft.options.map((option, optionIndex) => (
            <div key={optionIndex} className="flex items-center gap-3">
              <input
                type="radio"
                name={`correct-${index}`}
                checked={draft.correctIndex === optionIndex}
                onChange={() => patch(index, { correctIndex: optionIndex })}
                aria-label={`Правильна відповідь ${String.fromCharCode(65 + optionIndex)}`}
                className="accent-primary"
              />
              <div className="flex-1">
                <Input
                  value={option}
                  onChange={(e) => setOption(index, optionIndex, e.target.value)}
                  placeholder={`Варіант ${String.fromCharCode(65 + optionIndex)}`}
                />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted">Позначте радіокнопкою правильний варіант.</p>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...drafts, EMPTY_FACTORIES.quiz()])}>
        <Plus size={14} />
        Додати питання
      </Button>
    </div>
  )
}
