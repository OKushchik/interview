import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { QuizQuestion } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface QuizInterviewProps {
  questions: QuizQuestion[]
  answers: Record<string, number>
  onAnswer: (questionId: string, selectedIndex: number) => void
  onComplete: () => void
}

export function QuizInterview({ questions, answers, onAnswer, onComplete }: QuizInterviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const current = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      onComplete()
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }

  if (!current) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Питання {currentIndex + 1} з {questions.length}</span>
          <span className="text-cyan font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-cyan transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-text mb-6">{current.question}</h2>

        <div className="space-y-3">
          {current.options.map((option, index) => {
            const isSelected = answers[current.id] === index
            return (
              <button
                key={index}
                onClick={() => onAnswer(current.id, index)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border text-muted hover:border-border-hover hover:text-text'
                }`}
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-hover text-sm font-medium mr-3">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={handlePrev} disabled={currentIndex === 0}>
          <ChevronLeft size={16} />
          Назад
        </Button>
        <Button
          onClick={handleNext}
          disabled={answers[current.id] === undefined}
        >
          {currentIndex === questions.length - 1 ? 'Завершити' : 'Далі'}
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
