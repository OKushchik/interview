import { toVacancyDto, normalizeVacancyFields } from './schemas.js'
import { generateVacancyQuestions } from './vacancyQuestions.js'

export async function listVacancies(db, providerId) {
  const rows = await db.Vacancy.findAll({
    where: { providerId },
    order: [['createdAt', 'DESC']],
  })
  return rows.map(toVacancyDto)
}

/** Vacancy by id; if providerId is passed, searches only within that provider. */
export async function getVacancy(db, id, providerId) {
  const where = providerId ? { id, providerId } : { id }
  const row = await db.Vacancy.findOne({ where })
  return row ? toVacancyDto(row) : null
}

export async function createVacancy(db, userId, providerId, input, generator) {
  const normalized = normalizeVacancyFields({
    quizQuestions: input.quizQuestions,
    botQuestions: input.botQuestions,
    codingTasks: input.codingTasks,
  })
  const questions = await generateVacancyQuestions(
    { title: input.title, level: input.level, skills: input.skills },
    input.interviewConfig,
    generator,
    {
      quizQuestions: normalized.quizQuestions,
      botQuestions: normalized.botQuestions,
      codingTasks: normalized.codingTasks,
    },
  )
  const row = await db.Vacancy.create({
    userId,
    providerId,
    title: input.title,
    level: input.level,
    skills: input.skills,
    description: input.description,
    quizQuestions: questions.quizQuestions,
    botQuestions: questions.botQuestions,
    codingTasks: questions.codingTasks,
    interviewConfig: input.interviewConfig ?? null,
  })
  return toVacancyDto(row)
}

export async function patchVacancy(db, id, providerId, input, generator) {
  const existing = await db.Vacancy.findOne({ where: { id, providerId } })
  if (!existing) return null

  const normalized = normalizeVacancyFields({
    quizQuestions: input.quizQuestions,
    botQuestions: input.botQuestions,
    codingTasks: input.codingTasks,
  })

  const values = {}
  if (input.title !== undefined) values.title = input.title
  if (input.level !== undefined) values.level = input.level
  if (input.skills !== undefined) values.skills = input.skills
  if (input.description !== undefined) values.description = input.description
  if (input.quizQuestions !== undefined) values.quizQuestions = normalized.quizQuestions ?? null
  if (input.botQuestions !== undefined) values.botQuestions = normalized.botQuestions ?? null
  if (input.codingTasks !== undefined) values.codingTasks = normalized.codingTasks ?? null
  if (input.interviewConfig !== undefined) values.interviewConfig = input.interviewConfig

  // Generate missing questions for the current config; changed title/level/skills
  // make old questions stale, so in that case regenerate from scratch.
  const config = input.interviewConfig !== undefined ? input.interviewConfig : existing.interviewConfig
  const contentChanged = ['title', 'level'].some((key) => input[key] !== undefined && input[key] !== existing[key])
    || (input.skills !== undefined && JSON.stringify(input.skills) !== JSON.stringify(existing.skills))
  const questions = await generateVacancyQuestions(
    {
      title: values.title ?? existing.title,
      level: values.level ?? existing.level,
      skills: values.skills ?? existing.skills,
    },
    config,
    generator,
    {
      quizQuestions: 'quizQuestions' in values ? values.quizQuestions : existing.quizQuestions,
      botQuestions: 'botQuestions' in values ? values.botQuestions : existing.botQuestions,
      codingTasks: 'codingTasks' in values ? values.codingTasks : existing.codingTasks,
    },
    {
      force: contentChanged
        && input.quizQuestions === undefined
        && input.botQuestions === undefined
        && input.codingTasks === undefined,
    },
  )
  if (config) {
    values.quizQuestions = questions.quizQuestions
    values.botQuestions = questions.botQuestions
    values.codingTasks = questions.codingTasks
  }

  const row = await db.Vacancy.update(values, { where: { id, providerId } })
  return toVacancyDto(row)
}

export async function deleteVacancy(db, id, providerId) {
  const existing = await db.Vacancy.findOne({ where: { id, providerId } })
  if (!existing) return false
  await db.Vacancy.destroy({ where: { id, providerId } })
  return true
}
