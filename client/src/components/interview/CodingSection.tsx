import { useState } from 'react'
import { Code } from 'lucide-react'
import type { CodingTask } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface CodingSectionProps {
  tasks: CodingTask[]
  /** Код по id завдання. */
  codes: Record<string, string>
  onCodeChange: (taskId: string, code: string) => void
  onComplete: () => void
}

export function CodingSection({ tasks, codes, onCodeChange, onComplete }: CodingSectionProps) {
  const [lineCount] = useState(20)
  const [index, setIndex] = useState(0)

  const task = tasks[index]
  const isLast = index === tasks.length - 1
  const code = codes[task.id] ?? ''

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-cyan/20">
            <Code size={20} className="text-cyan" />
          </div>
          <h2 className="text-lg font-semibold text-text">{task.title}</h2>
          {tasks.length > 1 && (
            <span className="ml-auto text-sm text-muted">
              Завдання {index + 1} з {tasks.length}
            </span>
          )}
        </div>

        <p className="text-muted mb-6 leading-relaxed">{task.description}</p>

        <div className="relative rounded-xl overflow-hidden border border-border">
          <div className="flex items-center gap-2 px-4 py-2 bg-background/80 border-b border-border">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs text-muted ml-2">code-editor</span>
          </div>
          <textarea
            value={code || task.starterCode}
            onChange={(e) => onCodeChange(task.id, e.target.value)}
            rows={lineCount}
            spellCheck={false}
            className="w-full px-4 py-3 bg-code-bg text-code-text font-mono text-sm leading-6 focus:outline-none resize-y"
          />
        </div>

        <div className="flex justify-end mt-4">
          <Button
            onClick={() => (isLast ? onComplete() : setIndex(index + 1))}
            disabled={!code && !task.starterCode}
          >
            {isLast ? 'Завершити кодинг →' : 'Наступне завдання →'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
