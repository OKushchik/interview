import { isEmptyList } from '../lib/empty.js'
import { codingTaskCount } from '../lib/codingCount.js'

/**
 * Генерує питання для збереженої конфігурації співбесіди.
 * Кількість питань (questionCount) однакова і для Quiz, і для Online Bot;
 * завдань з онлайн-кодингу створюється codingCount, якщо enableCoding увімкнено.
 *
 * `current` — вже наявні питання; їх зберігаємо, якщо вони відповідають конфігурації
 * і `force` не вимагає перегенерації (змінилися title/level/skills).
 * Збій генерації не блокує збереження вакансії: поле лишається порожнім,
 * а питання створить prepareInterview під час проходження.
 */
export async function generateVacancyQuestions(vacancy, config, generator, current = {}, { force = false } = {}) {
  const result = {
    quizQuestions: current.quizQuestions ?? null,
    botQuestions: current.botQuestions ?? null,
    codingTasks: current.codingTasks ?? null,
  }
  if (!config || !generator) return result

  const needsList = (list, count) => force || isEmptyList(list) || list.length !== count
  const codingCount = codingTaskCount(config)

  const attempt = async (label, run) => {
    try {
      return await run()
    } catch (error) {
      console.error(`Question generation failed (${label}):`, error.message)
      return undefined
    }
  }

  const [quiz, bot, coding] = await Promise.all([
    needsList(result.quizQuestions, config.questionCount)
      ? attempt('quiz', () => generator.generateQuiz(vacancy, config.questionCount))
      : undefined,
    needsList(result.botQuestions, config.questionCount)
      ? attempt('bot', () => generator.generateBot(vacancy, config.questionCount))
      : undefined,
    codingCount > 0 && needsList(result.codingTasks, codingCount)
      ? attempt('coding', () => generator.generateCoding(vacancy, codingCount))
      : undefined,
  ])

  if (!isEmptyList(quiz)) result.quizQuestions = quiz
  if (!isEmptyList(bot)) result.botQuestions = bot
  if (!isEmptyList(coding)) result.codingTasks = coding
  if (codingCount === 0) result.codingTasks = null

  return result
}
