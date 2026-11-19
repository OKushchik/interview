import type { AuthStatus, InterviewType, SeniorityLevel, Theme, UserRole } from './type'

export interface Vacancy {
  id: string
  providerId?: string | null
  title: string
  level: SeniorityLevel
  skills: string[]
  description: string
  quizQuestions?: QuizQuestion[] | null
  botQuestions?: BotQuestion[] | null
  codingTasks?: CodingTask[] | null
  /** Збережена конфігурація співбесіди; null — користувач налаштовує сам. */
  interviewConfig?: InterviewConfig | null
}

export interface VacancyFormData {
  title: string
  level: SeniorityLevel
  skills: string[]
  interviewConfig?: InterviewConfig | null
}

export interface InterviewConfig {
  type: InterviewType
  questionCount: number
  enableCoding: boolean
  /** Кількість завдань з онлайн кодингу (0–20), діє лише коли enableCoding. */
  codingCount: number
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
  /** Еталонна відповідь (є у готових питань, наприклад мокових). */
  answer?: string
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
  codingTasks: CodingTask[]
  quizAnswers: QuizAnswer[]
  botAnswers: BotAnswer[]
  codingAnswers: CodingAnswer[]
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

export interface Provider {
  id: string
  name: string
  slug: string
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  providerId: string | null
  isGuest: boolean
  pendingEmail: string | null
  accessibleProviders: Provider[]
}

export interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

export interface AuthState {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  pendingVerificationEmail: string | null
  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginAsGuest: () => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: (email: string) => Promise<string>
  forgotPassword: (email: string) => Promise<string>
  resetPassword: (token: string, password: string) => Promise<string>
  changeEmail: (newEmail: string, password: string) => Promise<string>
  verifyEmailChange: (token: string) => Promise<void>
  clearError: () => void
  clearPendingVerification: () => void
  /** Оновлює користувача (наприклад, accessibleProviders) без показу завантаження. */
  refreshUser: () => Promise<void>
}

export interface InterviewState {
  currentSession: InterviewSession | null
  report: InterviewReport | null
  isGenerating: boolean

  startSession: (vacancy: Vacancy, config: InterviewConfig) => void
  setSession: (session: InterviewSession) => void
  setGenerating: (value: boolean) => void
  saveQuizAnswer: (answer: QuizAnswer) => void
  saveBotAnswer: (answer: BotAnswer) => void
  saveCodingAnswer: (answer: CodingAnswer) => void
  setReport: (report: InterviewReport) => void
  reset: () => void
}

export interface ProviderFormData {
  name: string
  slug: string
}

/** Користувач у списку super_admin (GET /api/users). */
export interface AdminUser {
  id: string
  email: string
  role: UserRole
  providerId: string | null
  isGuest: boolean
  emailVerified: boolean
  createdAt: string
}

export interface UserPatch {
  role?: UserRole
  providerId?: string | null
}

export interface AccessEntry {
  userId: string
  email: string
  createdAt: string
}

export interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

/** Максимуми повзунків (кількість питань у БД); тоді мінімум 0. Без limits діють діапазони адмін-форми. */
export interface InterviewConfigLimits {
  questions: number
  coding: number
}
