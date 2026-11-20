import { ArrowRight, Loader2, Pencil, Trash2 } from 'lucide-react'
import type { Vacancy, VacancyJsonAction } from '@/types'
import { SENIORITY_LABELS, SENIORITY_COLORS, VACANCY_JSON_OPTIONS } from '@/types'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface VacancyCardProps {
  vacancy: Vacancy
  onStart: (vacancy: Vacancy) => void
  /** If passed, an 'Edit' button is shown (admins only). */
  onEdit?: (vacancy: Vacancy) => void
  /** If passed, a 'Delete' button is shown (admins only). */
  onDelete?: (vacancy: Vacancy) => void
  /** If passed, a 'JSON' choice is shown (question import/export, admins only). */
  onJson?: (vacancy: Vacancy, action: VacancyJsonAction) => void
  /** Questions for this vacancy are being generated right now. */
  isLoading?: boolean
  /** The button is disabled (e.g. another vacancy is being generated). */
  startDisabled?: boolean
}

export function VacancyCard({ vacancy, onStart, onEdit, onDelete, onJson, isLoading = false, startDisabled = false }: VacancyCardProps) {
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

      <Button onClick={() => onStart(vacancy)} disabled={isLoading || startDisabled} className="w-full">
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Зачекайте трохи…
          </>
        ) : (
          <>
            Пройти співбесіду
            <ArrowRight size={16} />
          </>
        )}
      </Button>

      {(onEdit || onDelete) && (
        <div className="flex gap-2 mt-2">
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={() => onEdit(vacancy)} className="flex-1">
              <Pencil size={14} />
              Редагувати
            </Button>
          )}
          {onDelete && (
            <Button variant="danger" size="sm" onClick={() => onDelete(vacancy)} className="flex-1">
              <Trash2 size={14} />
              Видалити
            </Button>
          )}
        </div>
      )}

      {onJson && (
        <select
          value=""
          aria-label="JSON"
          onChange={(e) => onJson(vacancy, e.target.value as VacancyJsonAction)}
          className="mt-2 w-full px-3 py-1.5 text-sm rounded-xl bg-background/50 border border-border text-text focus:outline-none focus:border-primary/50 transition-colors"
        >
          <option value="" disabled className="bg-surface">JSON</option>
          {VACANCY_JSON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface">{opt.label}</option>
          ))}
        </select>
      )}
    </Card>
  )
}
