export type SeniorityLevel = 'junior' | 'middle' | 'senior'

export type InterviewType = 'quiz' | 'bot'

export interface Vacancy {
  id: string
  title: string
  level: SeniorityLevel
  skills: string[]
  description: string
  isCustom?: boolean
}

export interface VacancyFormData {
  title: string
  level: SeniorityLevel
  skills: string[]
}

export interface InterviewConfig {
  type: InterviewType
  questionCount: number
  enableCoding: boolean
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

export interface BotQuestion {
  id: string
  question: string
}

export interface CodingTask {
  id: string
  title: string
  description: string
  starterCode: string
}

export interface QuizAnswer {
  questionId: string
  selectedIndex: number
}

export interface BotAnswer {
  questionId: string
  answer: string
  feedback?: string
}

export interface CodingAnswer {
  taskId: string
  code: string
}

export interface InterviewSession {
  vacancy: Vacancy
  config: InterviewConfig
  quizQuestions: QuizQuestion[]
  botQuestions: BotQuestion[]
  codingTask?: CodingTask
  quizAnswers: QuizAnswer[]
  botAnswers: BotAnswer[]
  codingAnswer?: CodingAnswer
}

export interface InterviewReport {
  score: number
  maxScore: number
  strengths: string[]
  weaknesses: string[]
  codingFeedback?: string
  voiceFeedback?: string
  summary: string
}

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

export type UserRole = 'admin' | 'candidate'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  pendingEmail: string | null
  vacancies: unknown[]
}


