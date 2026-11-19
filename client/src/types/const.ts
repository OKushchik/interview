import { Target, Bot } from 'lucide-react'
import type { InterviewConfig } from './interface'
import type { InterviewType, ModalSize, SeniorityLevel } from './type'

export const SENIORITY_LABELS: Record<SeniorityLevel, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
}

export const SENIORITY_COLORS: Record<SeniorityLevel, string> = {
  junior: 'text-emerald-400',
  middle: 'text-yellow-400',
  senior: 'text-red-400',
}

export const AVAILABLE_SKILLS = [
  'React', 'Angular', 'Vue', 'TypeScript', 'JavaScript',
  'Node.js', 'Laravel', 'Python', 'PostgreSQL', 'Docker',
  'Kubernetes', 'AWS', 'GraphQL', 'Redis', 'MongoDB',
  'Next.js', 'Tailwind CSS', 'Git', 'CI/CD', 'REST API',
]

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
  type: 'quiz',
  questionCount: 10,
  enableCoding: false,
  codingCount: 1,
}

export const INTERVIEW_TYPE_OPTIONS: { value: InterviewType; label: string; description: string; icon: typeof Target }[] = [
  {
    value: 'quiz',
    label: 'Quiz (Тести)',
    description: 'Питання з 4 варіантами відповідей',
    icon: Target,
  },
  {
    value: 'bot',
    label: 'Online Bot',
    description: 'Вільна форма з текстом або голосом',
    icon: Bot,
  },
]

export const SENIORITY_LEVEL_OPTIONS: { value: SeniorityLevel; label: string; emoji: string }[] = [
  { value: 'junior', label: 'Junior', emoji: '🟢' },
  { value: 'middle', label: 'Middle', emoji: '🟡' },
  { value: 'senior', label: 'Senior', emoji: '🔴' },
]

/** Якщо в БД питань немає, їх згенерує сервер, тому ліміт — звичайний максимум 20. */
export const GENERATED_MAX = 20

export const MODAL_SIZES: Record<ModalSize, string> = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}
