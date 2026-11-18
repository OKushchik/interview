import type { InterviewConfig, InterviewReport, InterviewSession, PrepareResponse, Vacancy } from '@/types'
import { apiRequest } from './api'

export async function generateQuestions(
  vacancy: Vacancy,
  config: InterviewConfig,
): Promise<Pick<InterviewSession, 'quizQuestions' | 'botQuestions' | 'codingTask'>> {
  // Вакансія провайдера (є providerId) готується на сервері за id;
  // без провайдера передаємо замоковану вакансію.
  const body = vacancy.providerId ? { vacancyId: vacancy.id, config } : { vacancy, config }
  const data = await apiRequest<PrepareResponse>('/api/interview/prepare', {
    method: 'POST',
    body: JSON.stringify(body),
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
