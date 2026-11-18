import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { analyzeBotSchema, interviewPrepareSchema } from '../services/schemas.js'
import { prepareInterview } from '../services/prepareInterview.js'
import { getVacancy } from '../services/vacancyService.js'
import { canAccessCompany } from '../services/companyAccess.js'
import { z } from 'zod'

const vacancyBodySchema = z.object({
  id: z.string(),
  title: z.string(),
  level: z.enum(['junior', 'middle', 'senior']),
  skills: z.array(z.string()),
  description: z.string(),
}).passthrough()

const reportSchema = z.object({
  vacancy: vacancyBodySchema,
  config: z.object({
    type: z.enum(['quiz', 'bot']),
    questionCount: z.number(),
    enableCoding: z.boolean(),
  }),
  quizQuestions: z.array(z.any()).default([]),
  botQuestions: z.array(z.any()).default([]),
  codingTask: z.any().optional(),
  quizAnswers: z.array(z.any()).default([]),
  botAnswers: z.array(z.any()).default([]),
  codingAnswer: z.any().optional(),
})

export function createInterviewRouter(db, jwtSecret, generator) {
  const router = Router()
  router.use(createRequireAuth(jwtSecret))

  router.post('/prepare', async (req, res, next) => {
    try {
      const parsed = interviewPrepareSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const { vacancyId, config } = parsed.data

      // Вакансія береться з БД, а доступ перевіряється до її компанії.
      const vacancy = await getVacancy(db, vacancyId)
      if (!vacancy) {
        res.status(404).json({ error: 'Vacancy not found' })
        return
      }
      const [user, company] = await Promise.all([
        db.User.findOne({ where: { id: req.user.id } }),
        db.Company.findOne({ where: { id: vacancy.companyId } }),
      ])
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }
      if (!company || !(await canAccessCompany(db, user, company))) {
        res.status(403).json({ error: 'Forbidden' })
        return
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
          codingTask: null,
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
