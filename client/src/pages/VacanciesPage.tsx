import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Vacancy, VacancyFormData, InterviewConfig } from '@/types'
import { MOCK_VACANCIES } from '@/data/mockVacancies'
import { useAuthStore } from '@/store/authStore'
import { useInterviewStore } from '@/store/interviewStore'
import { generateQuestions } from '@/services/aiService'
import { Header } from '@/components/layout/Header'
import { VacancyCard } from '@/components/vacancies/VacancyCard'
import { CreateVacancyModal } from '@/components/modals/CreateVacancyModal'
import { InterviewConfigModal } from '@/components/modals/InterviewConfigModal'
import { Button } from '@/components/ui/Button'

export function VacanciesPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const { customVacancies, addCustomVacancy, startSession, setSession, setGenerating, isGenerating } =
    useInterviewStore()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null)
  const allVacancies = [...MOCK_VACANCIES, ...customVacancies]

  const handleStartInterview = (vacancy: Vacancy) => {
    setSelectedVacancy(vacancy)
    setShowConfigModal(true)
  }

  const handleCreateNext = (form: VacancyFormData) => {
    setShowCreateModal(false)
    const vacancy = addCustomVacancy(form)
    setSelectedVacancy(vacancy)
    setShowConfigModal(true)
  }

  const handleConfigStart = async (config: InterviewConfig) => {
    if (!selectedVacancy) return

    setGenerating(true)
    startSession(selectedVacancy, config)

    try {
      const questions = await generateQuestions(selectedVacancy, config)
      console.log('questions', questions)
      setSession({
        vacancy: selectedVacancy,
        config,
        quizQuestions: questions.quizQuestions,
        botQuestions: questions.botQuestions,
        codingTask: questions.codingTask,
        quizAnswers: [],
        botAnswers: [],
      })
      setShowConfigModal(false)
      navigate('/interview')
    } catch (error) {
      console.error('Failed to generate questions:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">
            Оберіть вакансію для співбесіди
          </h2>
          <p className="text-muted max-w-2xl mx-auto">
            Пройдіть автоматизовану технічну співбесіду у форматі Quiz або Online Bot
            з AI-аналізом ваших відповідей
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {allVacancies.map((vacancy) => (
            <VacancyCard
              key={vacancy.id}
              vacancy={vacancy}
              onStart={handleStartInterview}
            />
          ))}
        </div>

        {isAdmin && (
          <div className="flex justify-center">
            <Button size="lg" onClick={() => setShowCreateModal(true)}>
              <Plus size={20} />
              Створити власну вакансію
            </Button>
          </div>
        )}
      </main>

      {isAdmin && (
        <CreateVacancyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onNext={handleCreateNext}
        />
      )}

      <InterviewConfigModal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false)
          setSelectedVacancy(null)
        }}
        onStart={handleConfigStart}
        isGenerating={isGenerating}
        vacancyTitle={selectedVacancy?.title || ''}
      />
    </div>
  )
}
