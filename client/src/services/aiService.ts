import type { InterviewConfig, InterviewReport, InterviewSession, PrepareResponse, PreparedQuestions, Vacancy } from '@/types'
import { apiRequest } from './api'
import { pickRandom } from '@/utils/pickRandom'

/**
 * For a vacancy without a provider, takes ready-made questions from the vacancy itself.
 * If there are fewer questions than the config asks for, returns all available (without a request to the server).
 * Returns null only when there are no ready-made questions of the needed type at all (then the server generates).
 */
function prepareFromStored(vacancy: Vacancy, config: InterviewConfig): PreparedQuestions | null {
  if (vacancy.providerId) return null

  const quiz = vacancy.quizQuestions ?? []
  const bot = vacancy.botQuestions ?? []
  if (config.questionCount > 0) {
    if (config.type === 'quiz' && quiz.length === 0) return null
    if (config.type === 'bot' && bot.length === 0) return null
  }
  const codingCount = config.enableCoding ? config.codingCount ?? 1 : 0
  const coding = vacancy.codingTasks ?? []
  if (codingCount > 0 && coding.length === 0) return null

  return {
    quizQuestions: config.type === 'quiz' ? pickRandom(quiz, config.questionCount) : [],
    botQuestions: config.type === 'bot' ? pickRandom(bot, config.questionCount) : [],
    codingTasks: pickRandom(coding, codingCount),
  }
}

export async function generateQuestions(
  vacancy: Vacancy,
  config: InterviewConfig,
): Promise<PreparedQuestions> {
  // A mock vacancy with ready-made questions works without OpenAI.
  const local = prepareFromStored(vacancy, config)
  if (local) return local

  // A provider vacancy (has providerId) is prepared on the server by id;
  // without a provider we pass the mocked vacancy.
  const body = vacancy.providerId ? { vacancyId: vacancy.id, config } : { vacancy, config }
  const data = await apiRequest<PrepareResponse>('/api/interview/prepare', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return {
    quizQuestions: data.quizQuestions ?? [],
    botQuestions: data.botQuestions ?? [],
    codingTasks: data.codingTasks ?? [],
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
      codingTasks: session.codingTasks,
      quizAnswers: session.quizAnswers,
      botAnswers: session.botAnswers,
      codingAnswers: session.codingAnswers,
    }),
  })
  return data.report
}
