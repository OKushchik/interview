import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { analyzeBotSchema } from '../services/schemas.js'
import { z } from 'zod'

const reportSchema = z.object({
  vacancy: z.object({
    id: z.string(),
    title: z.string(),
    level: z.enum(['junior', 'middle', 'senior']),
    skills: z.array(z.string()),
    description: z.string(),
  }).passthrough(),
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

export function createInterviewRouter(jwtSecret, generator) {
  const router = Router()
  router.use(createRequireAuth(jwtSecret))

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
