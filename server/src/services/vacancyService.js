import { toVacancyDto, normalizeVacancyFields } from './schemas.js'

export async function listVacancies(db, companyId) {
  const rows = await db.Vacancy.findAll({
    where: { companyId },
    order: [['createdAt', 'DESC']],
  })
  return rows.map(toVacancyDto)
}

/** Вакансія за id; якщо передано companyId, шукає лише в цій компанії. */
export async function getVacancy(db, id, companyId) {
  const where = companyId ? { id, companyId } : { id }
  const row = await db.Vacancy.findOne({ where })
  return row ? toVacancyDto(row) : null
}

export async function createVacancy(db, userId, companyId, input) {
  const normalized = normalizeVacancyFields({
    quizQuestions: input.quizQuestions,
    botQuestions: input.botQuestions,
    codingTask: input.codingTask,
  })
  const row = await db.Vacancy.create({
    userId,
    companyId,
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

export async function patchVacancy(db, id, companyId, input) {
  const existing = await db.Vacancy.findOne({ where: { id, companyId } })
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

  const row = await db.Vacancy.update(values, { where: { id, companyId } })
  return toVacancyDto(row)
}

export async function deleteVacancy(db, id, companyId) {
  const existing = await db.Vacancy.findOne({ where: { id, companyId } })
  if (!existing) return false
  await db.Vacancy.destroy({ where: { id, companyId } })
  return true
}
