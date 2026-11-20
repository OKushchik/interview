import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { analyzeBotSchema, interviewPrepareSchema, prepareSchema } from '../services/schemas.js'
import { prepareInterview } from '../services/prepareInterview.js'
import { getVacancy } from '../services/vacancyService.js'
import { canAccessProvider } from '../services/providerAccess.js'
import { z } from 'zod'

const vacancyBodySchema = z.object({
  id: z.string(),
  title: z.string(),
  level: z.enum(['junior', 'middle', 'senior']),
  skills: z.array(z.string()),
  description: z.string(),
}).passthrough()

// Vacancy without a provider (mock data on the client): only the fields for question generation,
// ready-made questions from the request body are not accepted.
const inlineVacancySchema = z.object({
  id: z.string(),
  title: z.string(),
  level: z.enum(['junior', 'middle', 'senior']),
  skills: z.array(z.string()),
  description: z.string(),
})

const prepareBodySchema = z.union([
  interviewPrepareSchema,
  z.object({ vacancy: inlineVacancySchema, config: prepareSchema }),
])

const reportSchema = z.object({
  vacancy: vacancyBodySchema,
  config: z.object({
    type: z.enum(['quiz', 'bot']),
    questionCount: z.number(),
    enableCoding: z.boolean(),
    codingCount: z.number().optional(),
  }),
  quizQuestions: z.array(z.any()).default([]),
  botQuestions: z.array(z.any()).default([]),
  codingTasks: z.array(z.any()).default([]),
  quizAnswers: z.array(z.any()).default([]),
  botAnswers: z.array(z.any()).default([]),
  codingAnswers: z.array(z.any()).default([]),
})

/**
 * Saves the interview result for the admin overview. The provider is taken from the vacancy in the DB
 * (not from the request body) and only if the user has access to it; a save error does not block the report.
 */
async function saveInterviewResult(db, userId, vacancyId, report) {
  try {
    const user = await db.User.findOne({ where: { id: userId } })
    if (!user || user.isGuest) return
    const vacancy = await db.Vacancy.findOne({ where: { id: vacancyId } })
    if (!vacancy?.providerId) return
    const provider = await db.Provider.findOne({ where: { id: vacancy.providerId } })
    if (!provider || !(await canAccessProvider(db, user, provider))) return
    const max = Number(report?.maxScore) || 0
    await db.InterviewResult.create({
      userId,
      vacancyId: vacancy.id,
      providerId: provider.id,
      vacancyTitle: vacancy.title,
      providerName: provider.name,
      level: vacancy.level ?? null,
      score: max > 0 ? Math.round((Number(report.score) / max) * 100) : 0,
      report,
    })
  } catch (error) {
    console.error('Failed to save interview result:', error.message)
  }
}

export function createInterviewRouter(db, jwtSecret, generator) {
  const router = Router()
  router.use(createRequireAuth(jwtSecret))

  router.post('/prepare', async (req, res, next) => {
    try {
      const parsed = prepareBodySchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const { config } = parsed.data
      let vacancy

      if ('vacancyId' in parsed.data) {
        // Provider vacancy: take it from the DB and check access to its provider.
        vacancy = await getVacancy(db, parsed.data.vacancyId)
        if (!vacancy) {
          res.status(404).json({ error: 'Vacancy not found' })
          return
        }
        const [user, provider] = await Promise.all([
          db.User.findOne({ where: { id: req.user.id } }),
          db.Provider.findOne({ where: { id: vacancy.providerId } }),
        ])
        if (!user) {
          res.status(401).json({ error: 'Unauthorized' })
          return
        }
        if (!provider || !(await canAccessProvider(db, user, provider))) {
          res.status(403).json({ error: 'Forbidden' })
          return
        }
      } else {
        // No provider: work with the passed (mock) vacancy, questions are generated.
        vacancy = parsed.data.vacancy
      }

      const prepared = await prepareInterview(vacancy, config, generator)
      res.json({
        vacancy,
        config,
        ...prepared,
      })
    } catch (error) {
      next(error)
    }
  })

  router.post('/analyze-bot', async (req, res, next) => {
    try {
      const parsed = analyzeBotSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const feedback = await generator.analyzeBotAnswer(parsed.data.question, parsed.data.answer)
      res.json({ feedback })
    } catch (error) {
      next(error)
    }
  })

  router.post('/report', async (req, res, next) => {
    try {
      const parsed = reportSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const report = await generator.generateReport({
        ...parsed.data,
        vacancy: {
          ...parsed.data.vacancy,
          quizQuestions: null,
          botQuestions: null,
          codingTasks: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      await saveInterviewResult(db, req.user.id, parsed.data.vacancy.id, report)
      res.json({ report })
    } catch (error) {
      next(error)
    }
  })

  return router
}
