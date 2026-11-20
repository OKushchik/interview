import { isEmptyList } from '../lib/empty.js'
import { codingTaskCount } from '../lib/codingCount.js'
import { pickRandom } from '../lib/pickRandom.js'

export async function prepareInterview(vacancy, config, generator) {
  let quizQuestions = []
  let botQuestions = []
  let codingTasks = []

  if (config.type === 'quiz') {
    if (!isEmptyList(vacancy.quizQuestions)) {
      quizQuestions = pickRandom(vacancy.quizQuestions, config.questionCount)
    } else if (config.questionCount > 0) {
      quizQuestions = await generator.generateQuiz(vacancy, config.questionCount)
    }
  }

  if (config.type === 'bot') {
    if (!isEmptyList(vacancy.botQuestions)) {
      botQuestions = pickRandom(vacancy.botQuestions, config.questionCount)
    } else if (config.questionCount > 0) {
      botQuestions = await generator.generateBot(vacancy, config.questionCount)
    }
  }

  const codingCount = codingTaskCount(config)
  if (codingCount > 0) {
    if (!isEmptyList(vacancy.codingTasks)) {
      codingTasks = pickRandom(vacancy.codingTasks, codingCount)
    } else {
      codingTasks = (await generator.generateCoding(vacancy, codingCount)) ?? []
    }
  }

  return { quizQuestions, botQuestions, codingTasks }
}
