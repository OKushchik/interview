import type {
  Vacancy,
  InterviewConfig,
  InterviewSession,
  InterviewReport,
  QuizQuestion,
  BotQuestion,
  CodingTask,
} from '@/types'
import { apiRequest } from './api'

type PrepareResponse = {
  quizQuestions: QuizQuestion[]
  botQuestions: BotQuestion[]
  codingTask?: CodingTask
}

export async function generateQuestions(
  vacancy: Vacancy,
  config: InterviewConfig,
): Promise<Pick<InterviewSession, 'quizQuestions' | 'botQuestions' | 'codingTask'>> {
  const data = await apiRequest<PrepareResponse>('/api/interview/prepare', {
    method: 'POST',
    body: JSON.stringify({ vacancy, config }),
  })

  return {
    quizQuestions: data.quizQuestions ?? [],
    botQuestions: data.botQuestions ?? [],
    codingTask: data.codingTask,
  }
}

export async function analyzeBotAnswer(
  question: string,
  answer: string,
): Promise<string> {
  const data = await apiRequest<{ feedback: string }>('/api/interview/analyze-bot', {
    method: 'POST',
    body: JSON.stringify({ question, answer }),
  })
  return data.feedback
}

export async function generateReport(session: InterviewSession): Promise<InterviewReport> {
  const data = await apiRequest<{ report: InterviewReport }>('/api/interview/report', {
    method: 'POST',
    body: JSON.stringify({
      vacancy: session.vacancy,
      config: session.config,
      quizQuestions: session.quizQuestions,
      botQuestions: session.botQuestions,
      codingTask: session.codingTask,
      quizAnswers: session.quizAnswers,
      botAnswers: session.botAnswers,
      codingAnswer: session.codingAnswer,
    }),
  })
  return data.report
}
