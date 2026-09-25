import { ArrowRight } from 'lucide-react'
import type { Vacancy } from '@/types'
import { SENIORITY_LABELS, SENIORITY_COLORS } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface VacancyCardProps {
  vacancy: Vacancy
  onStart: (vacancy: Vacancy) => void
}

export function VacancyCard({ vacancy, onStart }: VacancyCardProps) {
  return (
    <Card hoverable className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-text">{vacancy.title}</h3>
        <span className={`text-sm font-medium ${SENIORITY_COLORS[vacancy.level]}`}>
          {SENIORITY_LABELS[vacancy.level]}
        </span>
      </div>

      <p className="text-sm text-muted mb-4 flex-grow">{vacancy.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {vacancy.skills.map((skill) => (
          <Badge key={skill} variant="primary">{skill}</Badge>
        ))}
      </div>

      <Button onClick={() => onStart(vacancy)} className="w-full">
        Пройти співбесіду
        <ArrowRight size={16} />
      </Button>
    </Card>
  )
}
