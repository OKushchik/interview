import { isEmptyList } from '../lib/empty.js'
import { codingTaskCount } from '../lib/codingCount.js'

/**
 * Generates questions for a saved interview configuration.
 * The question count (questionCount) is the same for Quiz and Online Bot;
 * codingCount online coding tasks are created if enableCoding is on.
 *
 * `current` - questions that already exist; they are kept if they match the config
 * and `force` does not require regeneration (title/level/skills changed).
 * A generation failure does not block saving the vacancy: the field stays empty,
 * and prepareInterview will create the questions during the interview.
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
