import { toVacancyDto, normalizeVacancyFields } from './schemas.js'

export async function listVacancies(db) {
  const rows = await db.Vacancy.findAll({
    where: {},
    order: [['createdAt', 'DESC']],
  })
  return rows.map(toVacancyDto)
}

export async function getVacancy(db, id) {
  const row = await db.Vacancy.findOne({ where: { id } })
  return row ? toVacancyDto(row) : null
}

export async function createVacancy(db, userId, input) {
  const normalized = normalizeVacancyFields({
    quizQuestions: input.quizQuestions,
    botQuestions: input.botQuestions,
    codingTask: input.codingTask,
  })
  const row = await db.Vacancy.create({
    userId,
    title: input.title,
    level: input.level,
    skills: input.skills,
    description: input.description,
    quizQuestions: normalized.quizQuestions ?? null,
    botQuestions: normalized.botQuestions ?? null,
    codingTask: normalized.codingTask ?? null,
  })
  return toVacancyDto(row)
}

export async function patchVacancy(db, id, input) {
  const existing = await db.Vacancy.findOne({ where: { id } })
  if (!existing) return null

  const normalized = normalizeVacancyFields({
    quizQuestions: input.quizQuestions,
    botQuestions: input.botQuestions,
    codingTask: input.codingTask,
  })

  const values = {}
  if (input.title !== undefined) values.title = input.title
  if (input.level !== undefined) values.level = input.level
  if (input.skills !== undefined) values.skills = input.skills
  if (input.description !== undefined) values.description = input.description
  if (input.quizQuestions !== undefined) values.quizQuestions = normalized.quizQuestions ?? null
  if (input.botQuestions !== undefined) values.botQuestions = normalized.botQuestions ?? null
  if (input.codingTask !== undefined) values.codingTask = normalized.codingTask ?? null

  const row = await db.Vacancy.update(values, { where: { id } })
  return toVacancyDto(row)
}

export async function deleteVacancy(db, id) {
  const existing = await db.Vacancy.findOne({ where: { id } })
  if (!existing) return false
  await db.Vacancy.destroy({ where: { id } })
  return true
}
