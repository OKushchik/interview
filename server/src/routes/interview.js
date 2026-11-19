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

// Вакансія без провайдера (мок-дані на клієнті): лише поля для генерації питань,
// готові питання з тіла запиту не приймаються.
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
        // Вакансія провайдера: беремо з БД і перевіряємо доступ до її провайдера.
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
        // Немає провайдера: працюємо з переданою (мок) вакансією, питання генеруються.
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
      res.json({ report })
    } catch (error) {
      next(error)
    }
  })

  return router
}
