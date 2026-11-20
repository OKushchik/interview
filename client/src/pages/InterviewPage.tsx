import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useInterviewStore } from '@/store/interviewStore'
import { useVacanciesPath } from '@/hooks/useVacanciesPath'
import { generateReport } from '@/services/aiService'
import { Header } from '@/components/layout/Header'
import { QuizInterview } from '@/components/interview/QuizInterview'
import { BotInterview } from '@/components/interview/BotInterview'
import { CodingSection } from '@/components/interview/CodingSection'
import type { InterviewPhase } from '@/types'
import { providerPath } from '@/utils/paths'

export function InterviewPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const backPath = useVacanciesPath()
  const {
    currentSession,
    saveQuizAnswer,
    saveBotAnswer,
    saveCodingAnswer,
    setReport,
  } = useInterviewStore()

  const [phase, setPhase] = useState<InterviewPhase>('interview')
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const [botAnswers, setBotAnswers] = useState<Record<string, { answer: string; feedback?: string }>>({})
  const [codingCodes, setCodingCodes] = useState<Record<string, string>>({})

  if (!currentSession) {
    navigate(slug ? providerPath(slug, 'vacancies') : backPath)
    return null
  }

  const { vacancy, config, quizQuestions, botQuestions, codingTasks } = currentSession
  const hasCoding = config.enableCoding && codingTasks.length > 0
  const hasQuestions = config.type === 'quiz' ? quizQuestions.length > 0 : botQuestions.length > 0

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
    if (hasCoding) {
      setPhase('coding')
    } else {
      finishAndGenerateReport()
    }
  }

  const handleBotComplete = () => {
    if (hasCoding) {
      setPhase('coding')
    } else {
      finishAndGenerateReport()
    }
  }

  const handleCodingComplete = () => {
    codingTasks.forEach((task) => {
      saveCodingAnswer({ taskId: task.id, code: codingCodes[task.id] || task.starterCode })
    })
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

        {phase === 'interview' && !hasQuestions && !hasCoding && (
          <p className="text-center text-muted py-16">Для цієї вакансії немає питань.</p>
        )}

        {phase === 'interview' && !hasQuestions && hasCoding && (
          <CodingSection
            tasks={codingTasks}
            codes={codingCodes}
            onCodeChange={(taskId, code) => setCodingCodes((prev) => ({ ...prev, [taskId]: code }))}
            onComplete={handleCodingComplete}
          />
        )}

        {phase === 'interview' && hasQuestions && config.type === 'quiz' && (
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

        {phase === 'interview' && hasQuestions && config.type === 'bot' && (
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

        {phase === 'coding' && hasCoding && (
          <CodingSection
            tasks={codingTasks}
            codes={codingCodes}
            onCodeChange={(taskId, code) => setCodingCodes((prev) => ({ ...prev, [taskId]: code }))}
            onComplete={handleCodingComplete}
          />
        )}
      </main>
    </div>
  )
}
