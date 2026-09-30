import { useState } from 'react'
import { Trophy, TrendingUp, AlertTriangle, Code, Bot, ListChecks, Check, X, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type {
  InterviewReport,
  QuizReportSection,
  BotReportSection,
  CodingReportSection,
} from '@/types'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

interface SummaryReportProps {
  report: InterviewReport
  vacancyTitle: string
}

type SectionKey = 'quiz' | 'coding' | 'bot'

const SECTION_LABELS: Record<SectionKey, string> = {
  quiz: 'Тести',
  coding: 'Онлайн кодінг',
  bot: 'Відповіді боту',
}

function percent(score: number, maxScore: number) {
  if (!maxScore) return 0
  return Math.round((score / maxScore) * 100)
}

function ScoreCard({ icon, label, score, maxScore, caption }: {
  icon: React.ReactNode
  label: string
  score: number
  maxScore: number
  caption?: string
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-semibold text-text">{label}</h3>
      </div>
      <div className="text-3xl font-bold gradient-text">{score}/{maxScore}</div>
      {caption && <p className="text-xs text-muted mt-1">{caption}</p>}
      <div className="mt-3 h-2 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-cyan transition-all duration-700"
          style={{ width: `${percent(score, maxScore)}%` }}
        />
      </div>
    </Card>
  )
}

function QuizAnalysis({ section }: { section: QuizReportSection }) {
  return (
    <div className="space-y-4">
      {section.summary && <p className="text-sm text-muted">{section.summary}</p>}
      {section.details.map((detail, index) => (
        <div
          key={detail.questionId}
          className={`p-4 rounded-xl border ${
            detail.isCorrect ? 'border-emerald/20 bg-emerald/5' : 'border-red-400/20 bg-red-400/5'
          }`}
        >
          <div className="flex items-start gap-2">
            {detail.isCorrect
              ? <Check size={16} className="text-emerald mt-1 shrink-0" />
              : <X size={16} className="text-red-400 mt-1 shrink-0" />}
            <p className="text-text font-medium">{index + 1}. {detail.question}</p>
          </div>
          <dl className="mt-3 space-y-1 text-sm pl-6">
            <div className="flex gap-2">
              <dt className="text-muted shrink-0">Ваша відповідь:</dt>
              <dd className={detail.isCorrect ? 'text-emerald' : 'text-red-400'}>{detail.selectedAnswer}</dd>
            </div>
            {!detail.isCorrect && (
              <div className="flex gap-2">
                <dt className="text-muted shrink-0">Правильна відповідь:</dt>
                <dd className="text-emerald">{detail.correctAnswer}</dd>
              </div>
            )}
          </dl>
          {detail.explanation && (
            <p className="mt-3 pl-6 text-sm text-muted">{detail.explanation}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function CodingAnalysis({ section }: { section: CodingReportSection }) {
  return (
    <div className="space-y-4">
      {section.summary && <p className="text-sm text-muted">{section.summary}</p>}
      {section.correctness && (
        <div className="p-4 rounded-xl border border-border bg-background/50">
          <p className="text-sm text-cyan mb-1">Коректність рішення</p>
          <p className="text-sm text-text">{section.correctness}</p>
        </div>
      )}
      {section.readability && (
        <div className="p-4 rounded-xl border border-border bg-background/50">
          <p className="text-sm text-cyan mb-1">Читабельність і структура</p>
          <p className="text-sm text-text">{section.readability}</p>
        </div>
      )}
      {section.improvements.length > 0 && (
        <div>
          <p className="text-sm text-yellow-400 mb-2">Що варто покращити</p>
          <ul className="space-y-2">
            {section.improvements.map((item, index) => (
              <li key={index} className="text-sm text-muted flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function BotAnalysis({ section }: { section: BotReportSection }) {
  return (
    <div className="space-y-4">
      {section.summary && <p className="text-sm text-muted">{section.summary}</p>}
      {section.details.map((detail, index) => (
        <div key={detail.questionId} className="p-4 rounded-xl border border-border bg-background/50">
          <p className="text-text font-medium">{index + 1}. {detail.question}</p>
          <p className="mt-2 text-sm text-muted">
            <span className="text-muted/70">Ваша відповідь: </span>
            {detail.answer}
          </p>
          {detail.analysis && (
            <p className="mt-3 pt-3 border-t border-border text-sm text-text">{detail.analysis}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export function SummaryReport({ report, vacancyTitle }: SummaryReportProps) {
  const navigate = useNavigate()
  const { quiz, coding, bot } = report.sections
  const overallPercentage = percent(report.score, report.maxScore)

  const availableSections = (['quiz', 'coding', 'bot'] as SectionKey[]).filter((key) => report.sections[key])
  const [activeSection, setActiveSection] = useState<SectionKey | undefined>(availableSections[0])

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
          {overallPercentage >= 80 ? 'Відмінний результат!' : overallPercentage >= 60 ? 'Гарний результат!' : 'Є простір для росту'}
        </p>
        <div className="mt-4 h-3 rounded-full bg-surface overflow-hidden max-w-xs mx-auto">
          <div
            className="h-full bg-gradient-to-r from-primary to-cyan transition-all duration-1000"
            style={{ width: `${overallPercentage}%` }}
          />
        </div>
      </Card>

      {availableSections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quiz && (
            <ScoreCard
              icon={<ListChecks size={20} className="text-cyan" />}
              label={SECTION_LABELS.quiz}
              score={quiz.score}
              maxScore={quiz.maxScore}
              caption={`${quiz.correctCount} з ${quiz.totalCount} правильних`}
            />
          )}
          {coding && (
            <ScoreCard
              icon={<Code size={20} className="text-primary" />}
              label={SECTION_LABELS.coding}
              score={coding.score}
              maxScore={coding.maxScore}
            />
          )}
          {bot && (
            <ScoreCard
              icon={<Bot size={20} className="text-emerald" />}
              label={SECTION_LABELS.bot}
              score={bot.score}
              maxScore={bot.maxScore}
              caption={`${bot.details.length} відповідей`}
            />
          )}
        </div>
      )}

      {report.summary && <p className="text-center text-text leading-relaxed">{report.summary}</p>}

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

      {activeSection && (
        <Card>
          <h3 className="font-semibold text-text mb-4">Повний аналіз</h3>
          <Select
            label="Оберіть частину співбесіди"
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as SectionKey)}
            options={availableSections.map((key) => ({ value: key, label: SECTION_LABELS[key] }))}
          />
          <div className="mt-6">
            {activeSection === 'quiz' && quiz && <QuizAnalysis section={quiz} />}
            {activeSection === 'coding' && coding && <CodingAnalysis section={coding} />}
            {activeSection === 'bot' && bot && <BotAnalysis section={bot} />}
          </div>
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
