import type { BotQuestion, CodingTask, InterviewSession, QuizQuestion } from './interface'

export type SeniorityLevel = 'junior' | 'middle' | 'senior'

export type InterviewType = 'quiz' | 'bot'

export type UserRole = 'super_admin' | 'provider_admin' | 'user'

export type ReportSectionKey = 'quiz' | 'coding' | 'bot'

export type InterviewPhase = 'interview' | 'coding' | 'generating'

export type AuthMode = 'login' | 'register'

export type PrepareResponse = {
  quizQuestions: QuizQuestion[]
  botQuestions: BotQuestion[]
  codingTasks?: CodingTask[]
}

export type AuthCredentials = { email: string; password: string }

export type RegisterCredentials = AuthCredentials

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

export type Theme = 'dark' | 'light'

/** Кому видати доступ: за id (зі списку) або за email. */
export type AccessGrant = { userId: string } | { email: string }

export type LoadStatus = 'loading' | 'ready' | 'forbidden' | 'error'

export type PreparedQuestions = Pick<InterviewSession, 'quizQuestions' | 'botQuestions' | 'codingTasks'>

export type ModalSize = 'md' | 'lg' | 'xl'

export type VacancyJsonAction = 'import' | 'export'

export type ManualSection = 'quiz' | 'bot' | 'coding'

export type ManualStep = 'details' | ManualSection

export type TopicCreateMode = 'ai' | 'own'

export type TopicCreateStep = 'mode' | 'text' | 'questions'
