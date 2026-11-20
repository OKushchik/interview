import { Target, Bot } from 'lucide-react'
import type { InterviewConfig } from './interface'
import type { InterviewType, ManualSection, ModalSize, SeniorityLevel, VacancyJsonAction } from './type'

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

export const VACANCY_JSON_OPTIONS: { value: VacancyJsonAction; label: string }[] = [
  { value: 'import', label: 'Імпорт JSON' },
  { value: 'export', label: 'Експорт JSON' },
]

export const VACANCY_JSON_EXAMPLE = `{
  "quizQuestions": [
    {
      "id": "q1",
      "question": "Текст питання",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Пояснення (необов'язково)"
    }
  ],
  "botQuestions": [
    { "id": "b1", "question": "Текст питання", "answer": "Еталонна відповідь (необов'язково)" }
  ],
  "codingTasks": [
    { "id": "coding-1", "title": "Назва", "description": "Опис завдання", "starterCode": "// код" }
  ]
}`

export const MANUAL_SECTIONS: ManualSection[] = ['quiz', 'bot', 'coding']

export const MANUAL_SECTION_LABELS: Record<ManualSection, string> = {
  quiz: 'Quiz',
  bot: 'Online Bot',
  coding: 'Coding Task',
}

export const TEXTAREA_CLASS =
  'w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-text placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors'

/** Максимальна довжина тексту теми (збігається з сервером). */
export const TOPIC_CONTENT_MAX = 50000

export const TOPIC_QUESTION_COUNT_DEFAULT = 10
