import { z } from 'zod'

export const quizQuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
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

export const prepareSchema = z.object({
  type: z.enum(['quiz', 'bot']),
  questionCount: z.number().int().min(1).max(20),
  enableCoding: z.boolean(),
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
