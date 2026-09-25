import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInterviewStore } from '@/store/interviewStore'
import { Header } from '@/components/layout/Header'
import { SummaryReport } from '@/components/report/SummaryReport'

export function ReportPage() {
  const navigate = useNavigate()
  const { report, currentSession } = useInterviewStore()

  useEffect(() => {
    if (!report || !currentSession) {
      navigate('/vacancies')
    }
  }, [report, currentSession, navigate])

  if (!report || !currentSession) return null

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SummaryReport report={report} vacancyTitle={currentSession.vacancy.title} />
      </main>
    </div>
  )
}
