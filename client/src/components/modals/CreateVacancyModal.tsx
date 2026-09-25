import { useState } from 'react'
import type { VacancyFormData, SeniorityLevel } from '@/types'
import { AVAILABLE_SKILLS } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface CreateVacancyModalProps {
  isOpen: boolean
  onClose: () => void
  onNext: (data: VacancyFormData) => void
}

const LEVELS: { value: SeniorityLevel; label: string; emoji: string }[] = [
  { value: 'junior', label: 'Junior', emoji: '🟢' },
  { value: 'middle', label: 'Middle', emoji: '🟡' },
  { value: 'senior', label: 'Senior', emoji: '🔴' },
]

export function CreateVacancyModal({ isOpen, onClose, onNext }: CreateVacancyModalProps) {
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState<SeniorityLevel>('middle')
  const [skills, setSkills] = useState<string[]>([])

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || skills.length === 0) return
    onNext({ title: title.trim(), level, skills })
    setTitle('')
    setLevel('middle')
    setSkills([])
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Створити власну вакансію" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Назва вакансії"
          placeholder="Наприклад: Fullstack Developer"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="space-y-3">
          <label className="block text-sm font-medium text-muted">Рівень (Seniority)</label>
          <div className="grid grid-cols-3 gap-3">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevel(l.value)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  level === l.value
                    ? 'border-primary bg-primary/10 text-text'
                    : 'border-border text-muted hover:border-border-hover'
                }`}
              >
                <span className="text-lg">{l.emoji}</span>
                <p className="text-sm font-medium mt-1">{l.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-muted">
            Необхідні скіли (оберіть мінімум 1)
          </label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
            {AVAILABLE_SKILLS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className="transition-transform hover:scale-105"
              >
                <Badge variant={skills.includes(skill) ? 'cyan' : 'default'}>
                  {skill}
                </Badge>
              </button>
            ))}
          </div>
          {skills.length > 0 && (
            <p className="text-xs text-muted">Обрано: {skills.join(', ')}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button type="submit" disabled={!title.trim() || skills.length === 0}>
            Далі →
          </Button>
        </div>
      </form>
    </Modal>
  )
}
