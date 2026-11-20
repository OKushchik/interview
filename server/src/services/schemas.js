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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
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

// Client routes live under the /provider/<slug>/... prefix, so a slug cannot conflict with
// service pages (/login, /admin, ...). Only
// 'mine' remains: it would collide with GET /api/providers/mine.
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
    // provider_admin can manage several providers; the first becomes the primary one (providerId).
    providerIds: z.array(z.string().min(1)).max(100).optional(),
    // View-only providers (without edit rights).
    viewProviderIds: z.array(z.string().min(1)).max(100).optional(),
  })
  .refine(
    (v) => v.role !== undefined || v.providerId !== undefined || v.providerIds !== undefined || v.viewProviderIds !== undefined,
    'Nothing to update',
  )

// Access is granted by user id (super_admin picks from a list) or by email
// (provider_admin does not see the list of all users).
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
  // Empty content => the text is generated by AI from the title and description.
  content: z.string().trim().max(TOPIC_CONTENT_MAX).optional().default(''),
  quizQuestions: z.array(quizQuestionSchema).max(50).nullable().optional(),
  // How many questions AI should generate when quizQuestions is not passed.
  questionCount: z.number().int().min(1).max(20).optional().default(10),
  generateQuestions: z.boolean().optional().default(true),
})

// Topic editing: text and questions are passed in full, AI is not involved.
export const topicUpdateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(''),
  content: z.string().trim().min(1).max(TOPIC_CONTENT_MAX),
  quizQuestions: z.array(quizQuestionSchema).max(50).nullable().optional().default(null),
})

// Answers: question id -> index of the chosen option. The server calculates the score.
export const topicResultSchema = z.object({
  answers: z.record(z.string(), z.number().int().min(0).max(3)),
})

export function toTestResultDto(row) {
  return {
    id: row.id,
    topicId: row.topicId ?? null,
    providerId: row.providerId ?? null,
    topicTitle: row.topicTitle,
    providerName: row.providerName ?? null,
    score: row.score,
    correctCount: row.correctCount,
    total: row.total,
    details: row.details,
    createdAt: row.createdAt,
  }
}

/** The user's own interview result, together with the report. */
export function toOwnInterviewResultDto(row) {
  return { ...toInterviewResultDto(row, null), report: row.report }
}

/** Interview result for the admin overview (without the full report). */
export function toInterviewResultDto(row, email) {
  return {
    id: row.id,
    userId: row.userId,
    email,
    vacancyId: row.vacancyId ?? null,
    vacancyTitle: row.vacancyTitle,
    level: row.level ?? null,
    providerId: row.providerId ?? null,
    providerName: row.providerName ?? null,
    score: row.score,
    createdAt: row.createdAt,
  }
}

/** User result for the admin overview (without per-question answers). */
export function toTeamResultDto(row, email) {
  return {
    id: row.id,
    userId: row.userId,
    email,
    topicId: row.topicId ?? null,
    topicTitle: row.topicTitle,
    providerId: row.providerId ?? null,
    providerName: row.providerName ?? null,
    score: row.score,
    correctCount: row.correctCount,
    total: row.total,
    createdAt: row.createdAt,
  }
}

export function normalizeQuizIds(questions) {
  return questions.map((question, index) => ({ ...question, id: `q${index + 1}` }))
}

export function toTopicDto(row) {
  return {
    id: row.id,
    providerId: row.providerId ?? null,
    title: row.title,
    description: row.description,
    content: row.content,
    quizQuestions: row.quizQuestions ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
