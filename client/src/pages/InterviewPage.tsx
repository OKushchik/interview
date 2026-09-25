import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useInterviewStore } from '@/store/interviewStore'
import { generateReport } from '@/services/aiService'
import { Header } from '@/components/layout/Header'
import { QuizInterview } from '@/components/interview/QuizInterview'
import { BotInterview } from '@/components/interview/BotInterview'
import { CodingSection } from '@/components/interview/CodingSection'

type Phase = 'interview' | 'coding' | 'generating'

export function InterviewPage() {
  const navigate = useNavigate()
  const {
    currentSession,
    saveQuizAnswer,
    saveBotAnswer,
    saveCodingAnswer,
    setReport,
  } = useInterviewStore()

  const [phase, setPhase] = useState<Phase>('interview')
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [botAnswers, setBotAnswers] = useState<Record<string, { answer: string; feedback?: string }>>({})
  const [codingCode, setCodingCode] = useState('')

  if (!currentSession) {
    navigate('/vacancies')
    return null
  }

  const { vacancy, config, quizQuestions, botQuestions, codingTask } = currentSession

  const finishAndGenerateReport = async () => {
    setPhase('generating')
    try {
      const session = useInterviewStore.getState().currentSession!
      const report = await generateReport(session)
      setReport(report)
      navigate('/report')
    } catch (error) {
      console.error('Failed to generate report:', error)
      setPhase('interview')
    }
  }

  const handleQuizComplete = () => {
    if (config.enableCoding && codingTask) {
      setPhase('coding')
    } else {
      finishAndGenerateReport()
    }
  }

  const handleBotComplete = () => {
    if (config.enableCoding && codingTask) {
      setPhase('coding')
    } else {
      finishAndGenerateReport()
    }
  }

  const handleCodingComplete = () => {
    saveCodingAnswer({ taskId: codingTask!.id, code: codingCode || codingTask!.starterCode })
    finishAndGenerateReport()
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-text">{vacancy.title}</h2>
          <p className="text-sm text-muted mt-1">
            {config.type === 'quiz' ? '🎯 Quiz' : '🤖 Online Bot'}
            {config.enableCoding && ' + 💻 Кодинг'}
          </p>
        </div>

        {phase === 'generating' && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-primary mb-4" />
            <p className="text-lg text-text">AI аналізує ваші відповіді...</p>
            <p className="text-sm text-muted mt-2">Це може зайняти кілька секунд</p>
          </div>
        )}

        {phase === 'interview' && config.type === 'quiz' && (
          <QuizInterview
            questions={quizQuestions}
            answers={quizAnswers}
            onAnswer={(qId, idx) => {
              setQuizAnswers((prev) => ({ ...prev, [qId]: idx }))
              saveQuizAnswer({ questionId: qId, selectedIndex: idx })
            }}
            onComplete={handleQuizComplete}
          />
        )}

        {phase === 'interview' && config.type === 'bot' && (
          <BotInterview
            questions={botQuestions}
            answers={botAnswers}
            onAnswer={(qId, answer, feedback) => {
              setBotAnswers((prev) => ({ ...prev, [qId]: { answer, feedback } }))
              saveBotAnswer({ questionId: qId, answer, feedback })
            }}
            onComplete={handleBotComplete}
          />
        )}

        {phase === 'coding' && codingTask && (
          <CodingSection
            task={codingTask}
            code={codingCode}
            onCodeChange={setCodingCode}
            onComplete={handleCodingComplete}
          />
        )}
      </main>
    </div>
  )
}
