import type { BotQuestion, CodingTask, QuizQuestion } from './interface'

export type SeniorityLevel = 'junior' | 'middle' | 'senior'

export type InterviewType = 'quiz' | 'bot'

export type UserRole = 'super_admin' | 'company_admin' | 'user'

export type ReportSectionKey = 'quiz' | 'coding' | 'bot'

export type InterviewPhase = 'interview' | 'coding' | 'generating'

export type AuthMode = 'login' | 'register'

export type PrepareResponse = {
  quizQuestions: QuizQuestion[]
  botQuestions: BotQuestion[]
  codingTask?: CodingTask
}

export type AuthCredentials = { email: string; password: string }

export type RegisterCredentials = AuthCredentials

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

export type Theme = 'dark' | 'light'
