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

export const vacancyCreateSchema = z.object({
  title: z.string().trim().min(1),
  level: z.enum(['junior', 'middle', 'senior']),
  skills: z.array(z.string().min(1)).min(1),
  description: z.string().optional().default(''),
  quizQuestions: z.array(quizQuestionSchema).nullable().optional(),
  botQuestions: z.array(botQuestionSchema).nullable().optional(),
  codingTask: codingTaskSchema.nullable().optional(),
})

export const vacancyPatchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  level: z.enum(['junior', 'middle', 'senior']).optional(),
  skills: z.array(z.string().min(1)).min(1).optional(),
  description: z.string().optional(),
  quizQuestions: z.array(quizQuestionSchema).nullable().optional(),
  botQuestions: z.array(botQuestionSchema).nullable().optional(),
  codingTask: codingTaskSchema.nullable().optional(),
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

export const accessGrantSchema = z.object({
  userId: z.string().min(1),
})

export const prepareSchema = z.object({
  type: z.enum(['quiz', 'bot']),
  questionCount: z.number().int().min(1).max(20),
  enableCoding: z.boolean(),
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
  const coding = input.codingTask
  return {
    quizQuestions: withIds(input.quizQuestions, 'q') ?? null,
    botQuestions: withIds(input.botQuestions, 'b') ?? null,
    codingTask: coding
      ? { ...coding, id: coding.id || 'coding-1' }
      : coding === null
        ? null
        : undefined,
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
    codingTask: row.codingTask ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
