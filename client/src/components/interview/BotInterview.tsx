import { useState, useEffect } from 'react'
import { Mic, MicOff, Send, Loader2, Bot } from 'lucide-react'
import type { BotQuestion } from '@/types'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { analyzeBotAnswer } from '@/services/aiService'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface BotInterviewProps {
  questions: BotQuestion[]
  answers: Record<string, { answer: string; feedback?: string }>
  onAnswer: (questionId: string, answer: string, feedback?: string) => void
  onComplete: () => void
}

export function BotInterview({ questions, answers, onAnswer, onComplete }: BotInterviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [input, setInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { isListening, transcript, isSupported, startListening, stopListening, resetTranscript } =
    useSpeechRecognition()

  const current = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100
  const currentAnswer = answers[current?.id]

  useEffect(() => {
    if (transcript) setInput(transcript)
  }, [transcript])

  const handleSubmit = async () => {
    if (!input.trim() || !current) return
    setIsAnalyzing(true)
    try {
      const feedback = await analyzeBotAnswer(current.question, input.trim())
      onAnswer(current.id, input.trim(), feedback)
    } catch {
      onAnswer(current.id, input.trim(), 'Не вдалося отримати фідбек. Ваша відповідь збережена.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleNext = () => {
    setInput('')
    resetTranscript()
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      onComplete()
    }
  }

  const toggleMic = () => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
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
        <div className="flex items-start gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/20">
            <Bot size={20} className="text-primary" />
          </div>
          <p className="text-lg font-medium text-text flex-1">{current.question}</p>
        </div>

        {!currentAnswer ? (
          <div className="space-y-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Введіть вашу відповідь або скористайтесь мікрофоном..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border text-text placeholder:text-muted/50 focus:outline-none focus:border-primary/50 resize-none"
            />

            <div className="flex items-center gap-3">
              {isSupported && (
                <Button
                  variant={isListening ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={toggleMic}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  {isListening ? 'Зупинити' : 'Голосовий ввід'}
                </Button>
              )}
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isAnalyzing}
                className="ml-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Аналіз...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Надіслати
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-background/50 border border-border">
              <p className="text-sm text-muted mb-1">Ваша відповідь:</p>
              <p className="text-text">{currentAnswer.answer}</p>
            </div>
            {currentAnswer.feedback && (
              <div className="p-4 rounded-xl bg-emerald/10 border border-emerald/20">
                <p className="text-sm text-emerald mb-1">AI Фідбек:</p>
                <p className="text-text text-sm">{currentAnswer.feedback}</p>
              </div>
            )}
            <Button onClick={handleNext} className="w-full">
              {currentIndex === questions.length - 1 ? 'Завершити' : 'Наступне питання →'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
