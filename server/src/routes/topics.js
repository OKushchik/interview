import { Router } from 'express'
import { createRequireAuth } from '../middleware/requireAuth.js'
import { createRequireProviderAccess, requireProviderManage } from '../middleware/requireProviderAccess.js'
import {
  normalizeQuizIds,
  toTestResultDto,
  toTopicDto,
  topicCreateSchema,
  topicResultSchema,
  topicUpdateSchema,
} from '../services/schemas.js'

/**
 * /api/providers/:slug/topics — теми розділу «Статті» конкретного провайдера.
 * Читати й проходити тест може користувач з доступом до провайдера,
 * створювати/видаляти — лише super_admin і provider_admin.
 * provider_id береться з req.provider, а не з тіла запиту.
 */
export function createTopicsRouter(db, jwtSecret, generator) {
  const router = Router({ mergeParams: true })
  // Запис лише з рівнем 'manage' для цього провайдера (provider_admin «лише перегляд» — 403).
  const requireAdmin = requireProviderManage

  router.use(createRequireAuth(jwtSecret))
  router.use(createRequireProviderAccess(db))

  router.get('/', async (req, res, next) => {
    try {
      const rows = await db.Topic.findAll({
        where: { providerId: req.provider.id },
        order: [['createdAt', 'DESC']],
      })
      res.json({ topics: rows.map(toTopicDto) })
    } catch (error) {
      next(error)
    }
  })

  router.get('/:id', async (req, res, next) => {
    try {
      const row = await db.Topic.findOne({ where: { id: req.params.id, providerId: req.provider.id } })
      if (!row) {
        res.status(404).json({ error: 'Topic not found' })
        return
      }
      res.json({ topic: toTopicDto(row) })
    } catch (error) {
      next(error)
    }
  })

  // Зберігає результат проходження тесту; бали рахуються тут за питаннями теми.
  router.post('/:id/results', async (req, res, next) => {
    try {
      const parsed = topicResultSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      if (req.user.isGuest) {
        res.status(403).json({ error: 'Guest results are not saved' })
        return
      }
      const topic = await db.Topic.findOne({ where: { id: req.params.id, providerId: req.provider.id } })
      const questions = topic?.quizQuestions ?? []
      if (!topic || questions.length === 0) {
        res.status(404).json({ error: 'Topic quiz not found' })
        return
      }

      const details = questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        selectedIndex: parsed.data.answers[q.id] ?? null,
        explanation: q.explanation ?? null,
      }))
      const correctCount = details.filter((d) => d.selectedIndex === d.correctIndex).length
      const row = await db.TestResult.create({
        userId: req.user.id,
        topicId: topic.id,
        providerId: req.provider.id,
        topicTitle: topic.title,
        providerName: req.provider.name,
        score: Math.round((correctCount / details.length) * 100),
        correctCount,
        total: details.length,
        details,
      })
      res.status(201).json({ result: toTestResultDto(row) })
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
        providerId: req.provider.id,
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

  router.put('/:id', requireAdmin, async (req, res, next) => {
    try {
      const parsed = topicUpdateSchema.safeParse(req.body)
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' })
        return
      }
      const row = await db.Topic.findOne({ where: { id: req.params.id, providerId: req.provider.id } })
      if (!row) {
        res.status(404).json({ error: 'Topic not found' })
        return
      }
      const input = parsed.data
      const updated = await db.Topic.update(
        {
          title: input.title,
          description: input.description,
          content: input.content,
          quizQuestions: input.quizQuestions?.length ? normalizeQuizIds(input.quizQuestions) : null,
        },
        { where: { id: row.id, providerId: req.provider.id } },
      )
      res.json({ topic: toTopicDto(updated) })
    } catch (error) {
      next(error)
    }
  })

  router.delete('/:id', requireAdmin, async (req, res, next) => {
    try {
      const deleted = await db.Topic.destroy({ where: { id: req.params.id, providerId: req.provider.id } })
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
