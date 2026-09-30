export type SeniorityLevel = 'junior' | 'middle' | 'senior'

export type InterviewType = 'quiz' | 'bot'

export interface Vacancy {
  id: string
  title: string
  level: SeniorityLevel
  skills: string[]
  description: string
  isCustom?: boolean
  quizQuestions?: QuizQuestion[] | null
  botQuestions?: BotQuestion[] | null
  codingTask?: CodingTask | null
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
  explanation?: string
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

export interface QuizReportDetail {
  questionId: string
  question: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation: string
}

export interface QuizReportSection {
  score: number
  maxScore: number
  correctCount: number
  totalCount: number
  summary: string
  details: QuizReportDetail[]
}

export interface BotReportDetail {
  questionId: string
  question: string
  answer: string
  analysis: string
}

export interface BotReportSection {
  score: number
  maxScore: number
  summary: string
  details: BotReportDetail[]
}

export interface CodingReportSection {
  score: number
  maxScore: number
  summary: string
  correctness: string
  readability: string
  improvements: string[]
}

export interface InterviewReport {
  score: number
  maxScore: number
  sections: {
    quiz?: QuizReportSection
    bot?: BotReportSection
    coding?: CodingReportSection
  }
  strengths: string[]
  weaknesses: string[]
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
  vacancies: Vacancy[]
}


