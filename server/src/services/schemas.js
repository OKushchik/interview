import { z } from 'zod'

export const quizQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().optional(),
})

export const botQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1),
})

export const codingTaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  starterCode: z.string(),
})

export const registerSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8),
})

export const loginSchema = registerSchema

export const emailOnlySchema = z.object({
  email: registerSchema.shape.email,
})

export const tokenSchema = z.object({
  token: z.string().min(1),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export const changeEmailSchema = z.object({
  newEmail: registerSchema.shape.email,
  password: z.string().min(8),
})

const interviewConfigSchema = z.object({
  type: z.enum(['quiz', 'bot']),
  questionCount: z.number().int().min(1).max(20),
  enableCoding: z.boolean(),
  codingCount: z.number().int().min(1).max(20).default(1),
})

export const vacancyCreateSchema = z.object({
  title: z.string().trim().min(1),
  level: z.enum(['junior', 'middle', 'senior']),
  skills: z.array(z.string().min(1)).min(1),
  description: z.string().optional().default(''),
  quizQuestions: z.array(quizQuestionSchema).nullable().optional(),
  botQuestions: z.array(botQuestionSchema).nullable().optional(),
  codingTasks: z.array(codingTaskSchema).nullable().optional(),
  interviewConfig: interviewConfigSchema.nullable().optional(),
})

export const vacancyPatchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  level: z.enum(['junior', 'middle', 'senior']).optional(),
  skills: z.array(z.string().min(1)).min(1).optional(),
  description: z.string().optional(),
  quizQuestions: z.array(quizQuestionSchema).nullable().optional(),
  botQuestions: z.array(botQuestionSchema).nullable().optional(),
  codingTasks: z.array(codingTaskSchema).nullable().optional(),
  interviewConfig: interviewConfigSchema.nullable().optional(),
})

// Клієнтські маршрути живуть під префіксом /provider/<slug>/..., тому зі службовими
// сторінками (/login, /admin, ...) slug конфліктувати не може. Лишається лише
// 'mine': він збігався б з GET /api/providers/mine.
export const RESERVED_SLUGS = ['mine']

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9-]{2,40}$/, 'Slug must be 2-40 chars: a-z, 0-9, -')
  .refine((value) => !RESERVED_SLUGS.includes(value), 'Slug is reserved')

export const providerCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema,
})

export const providerPatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    slug: slugSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.slug !== undefined, 'Nothing to update')

export const userPatchSchema = z
  .object({
    role: z.enum(['super_admin', 'provider_admin', 'user']).optional(),
    providerId: z.string().min(1).nullable().optional(),
  })
  .refine((v) => v.role !== undefined || v.providerId !== undefined, 'Nothing to update')

// Доступ видається за id користувача (super_admin обирає зі списку) або за email
// (provider_admin не бачить список усіх користувачів).
export const accessGrantSchema = z.union([
  z.object({ userId: z.string().min(1) }),
  z.object({ email: registerSchema.shape.email }),
])

export const prepareSchema = z.object({
  type: z.enum(['quiz', 'bot']),
  questionCount: z.number().int().min(1).max(20),
  enableCoding: z.boolean(),
  codingCount: z.number().int().min(1).max(20).default(1),
})

export const interviewPrepareSchema = z.object({
  vacancyId: z.string().min(1),
  config: prepareSchema,
})

export const analyzeBotSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
})

function withIds(items, prefix) {
  if (items == null) return items
  return items.map((item, index) => ({
    ...item,
    id: item.id || `${prefix}${index + 1}`,
  }))
}

export function normalizeVacancyFields(input) {
  return {
    quizQuestions: withIds(input.quizQuestions, 'q') ?? null,
    botQuestions: withIds(input.botQuestions, 'b') ?? null,
    codingTasks: withIds(input.codingTasks, 'coding-') ?? null,
  }
}

export function toVacancyDto(row) {
  return {
    id: row.id,
    providerId: row.providerId ?? null,
    title: row.title,
    level: row.level,
    skills: row.skills,
    description: row.description,
    quizQuestions: row.quizQuestions ?? null,
    botQuestions: row.botQuestions ?? null,
    codingTasks: row.codingTasks ?? null,
    interviewConfig: row.interviewConfig ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const TOPIC_CONTENT_MAX = 50000

export const topicCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(''),
  // Порожній content => текст згенерує AI за назвою й описом.
  content: z.string().trim().max(TOPIC_CONTENT_MAX).optional().default(''),
  quizQuestions: z.array(quizQuestionSchema).max(50).nullable().optional(),
  // Скільки питань згенерувати AI, коли quizQuestions не передано.
  questionCount: z.number().int().min(1).max(20).optional().default(10),
  generateQuestions: z.boolean().optional().default(true),
})

export function normalizeQuizIds(questions) {
  return questions.map((question, index) => ({ ...question, id: `q${index + 1}` }))
}

export function toTopicDto(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    quizQuestions: row.quizQuestions ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
