import { Trophy, TrendingUp, AlertTriangle, Code, Mic, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { InterviewReport } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface SummaryReportProps {
  report: InterviewReport
  vacancyTitle: string
}

export function SummaryReport({ report, vacancyTitle }: SummaryReportProps) {
  const navigate = useNavigate()
  const percentage = Math.round((report.score / report.maxScore) * 100)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Результати співбесіди</h1>
        <p className="text-muted">{vacancyTitle}</p>
      </div>

      <Card className="text-center">
        <Trophy size={48} className="mx-auto text-yellow-400 mb-4" />
        <div className="text-5xl font-bold gradient-text mb-2">
          {report.score}/{report.maxScore}
        </div>
        <p className="text-muted">
          {percentage >= 80 ? 'Відмінний результат!' : percentage >= 60 ? 'Гарний результат!' : 'Є простір для росту'}
        </p>
        <div className="mt-4 h-3 rounded-full bg-surface overflow-hidden max-w-xs mx-auto">
          <div
            className="h-full bg-gradient-to-r from-primary to-cyan transition-all duration-1000"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </Card>

      <p className="text-center text-text leading-relaxed">{report.summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-emerald" />
            <h3 className="font-semibold text-text">Сильні сторони</h3>
          </div>
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <li key={i} className="text-sm text-muted flex items-start gap-2">
                <span className="text-emerald mt-0.5">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={20} className="text-yellow-400" />
            <h3 className="font-semibold text-text">Зони росту</h3>
          </div>
          <ul className="space-y-2">
            {report.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-muted flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">→</span>
                {w}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {report.codingFeedback && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Code size={20} className="text-cyan" />
            <h3 className="font-semibold text-text">Фідбек по кодингу</h3>
          </div>
          <p className="text-sm text-muted">{report.codingFeedback}</p>
        </Card>
      )}

      {report.voiceFeedback && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Mic size={20} className="text-primary" />
            <h3 className="font-semibold text-text">Фідбек по голосовим відповідям</h3>
          </div>
          <p className="text-sm text-muted">{report.voiceFeedback}</p>
        </Card>
      )}

      <div className="flex justify-center pt-4">
        <Button variant="secondary" onClick={() => navigate('/vacancies')}>
          <ArrowLeft size={16} />
          Повернутись до вакансій
        </Button>
      </div>
    </div>
  )
}
