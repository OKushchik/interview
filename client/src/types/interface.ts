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
  /** Saved interview configuration; null - the user configures it themselves. */
  interviewConfig?: InterviewConfig | null
}

export interface VacancyFormData {
  title: string
  level: SeniorityLevel
  skills: string[]
  interviewConfig?: InterviewConfig | null
  /** Questions entered manually (vacancy creation without AI). */
  quizQuestions?: QuizDraft[] | null
  botQuestions?: BotDraft[] | null
  codingTasks?: CodingDraft[] | null
}

export interface QuizDraft {
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export interface BotDraft {
  question: string
}

export interface CodingDraft {
  title: string
  description: string
  starterCode: string
}

export interface ManualDrafts {
  quiz: QuizDraft[]
  bot: BotDraft[]
  coding: CodingDraft[]
}

export interface InterviewConfig {
  type: InterviewType
  questionCount: number
  enableCoding: boolean
  /** Number of online coding tasks (0-20), applies only when enableCoding. */
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
  /** Reference answer (present in ready-made questions, e.g. mock ones). */
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
  /** false - view-only access. */
  canManage?: boolean
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
  changePassword: (currentPassword: string, newPassword: string) => Promise<string>
  verifyEmailChange: (token: string) => Promise<void>
  clearError: () => void
  clearPendingVerification: () => void
  /** Updates the user (e.g. accessibleProviders) without showing a loading state. */
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

/** User in the super_admin list (GET /api/users). */
export interface AdminUser {
  id: string
  email: string
  role: UserRole
  providerId: string | null
  /** All providers of the provider_admin. */
  providerIds: string[]
  /** View-only providers of the provider_admin. */
  viewProviderIds: string[]
  isGuest: boolean
  emailVerified: boolean
  createdAt: string
}

export interface UserPatch {
  role?: UserRole
  providerId?: string | null
  providerIds?: string[]
  viewProviderIds?: string[]
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

/** Slider maximums (number of questions in the DB); the minimum is then 0. Without limits the admin form ranges apply. */
export interface InterviewConfigLimits {
  questions: number
  coding: number
}

/** Format of the vacancy questions JSON file (import/export). */
export interface VacancyQuestionsJson {
  quizQuestions?: QuizQuestion[] | null
  botQuestions?: BotQuestion[] | null
  codingTasks?: CodingTask[] | null
}

export interface Topic {
  id: string
  title: string
  description: string
  content: string
  quizQuestions: QuizQuestion[] | null
  createdAt?: string
}

export interface TopicUpdateData {
  title: string
  description: string
  content: string
  quizQuestions: QuizDraft[] | null
}

export interface TopicFormData {
  title: string
  description: string
  /** Empty - the text is generated by AI from the title and description. */
  content: string
  /** Custom/generated questions; if not passed, the server generates them itself (if needed). */
  quizQuestions?: QuizDraft[] | null
  questionCount?: number
  generateQuestions?: boolean
}

export interface TestResultDetail {
  question: string
  options: string[]
  correctIndex: number
  /** null - no answer. */
  selectedIndex: number | null
  explanation: string | null
}

/** User result in the admin overview (without per-question answers). */
export interface TeamResult {
  id: string
  userId: string
  email: string | null
  topicId: string | null
  topicTitle: string
  providerId: string | null
  providerName: string | null
  score: number
  correctCount: number
  total: number
  createdAt: string
}

/** Interview result in the admin overview. */
export interface InterviewResultSummary {
  id: string
  userId: string
  email: string | null
  vacancyId: string | null
  vacancyTitle: string
  level: SeniorityLevel | null
  providerId: string | null
  providerName: string | null
  score: number
  createdAt: string
}

/** The user's own interview result: summary together with the report. */
export interface OwnInterviewResult extends InterviewResultSummary {
  report: InterviewReport
}

export interface TestResult {
  id: string
  topicId: string | null
  providerId: string | null
  topicTitle: string
  providerName: string | null
  score: number
  correctCount: number
  total: number
  details: TestResultDetail[]
  createdAt: string
}
