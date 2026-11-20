import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireRole } from '../middleware/requireRole.js'
import { normalizeQuizIds, toTopicDto, topicCreateSchema } from '../services/schemas.js'

/**
 * /api/topics — теми розділу «Аналіз статей».
 * Читати й проходити тест може будь-який автентифікований користувач,
 * створювати/видаляти — лише super_admin і provider_admin.
 */
export function createTopicsRouter(db, jwtSecret, generator) {
  const router = Router()
  const requireAdmin = createRequireRole(db)('super_admin', 'provider_admin')

  router.use(createRequireAuth(jwtSecret))

  router.get('/', async (_req, res, next) => {
    try {
      const rows = await db.Topic.findAll({ order: [['createdAt', 'DESC']] })
      res.json({ topics: rows.map(toTopicDto) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const row = await db.Topic.findOne({ where: { id: req.params.id } })
      if (!row) {
        res.status(404).json({ error: 'Topic not found' })
        return
      }
      res.json({ topic: toTopicDto(row) })
    } catch (error) {
      next(error)
    }
  })

  router.post('/', requireAdmin, async (req, res, next) => {
    try {
      const parsed = topicCreateSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const input = parsed.data
      const content = input.content || (await generator.generateTopicText(input.title, input.description))
      if (!content) {
        res.status(502).json({ error: 'Не вдалося згенерувати текст' })
        return
      }

      let quizQuestions = input.quizQuestions ? normalizeQuizIds(input.quizQuestions) : null
      if (!quizQuestions && input.generateQuestions) {
        // Збій генерації питань не блокує створення теми.
        try {
          quizQuestions = await generator.generateTopicQuiz({ title: input.title, content }, input.questionCount)
        } catch (error) {
          console.error('Topic quiz generation failed:', error.message)
        }
      }

      const row = await db.Topic.create({
        userId: req.user.id,
        title: input.title,
        description: input.description,
        content,
        quizQuestions: quizQuestions?.length ? quizQuestions : null,
      })
      res.status(201).json({ topic: toTopicDto(row) })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:id', requireAdmin, async (req, res, next) => {
    try {
      const deleted = await db.Topic.destroy({ where: { id: req.params.id } })
      if (!deleted) {
        res.status(404).json({ error: 'Topic not found' })
        return
      }
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  return router
}
