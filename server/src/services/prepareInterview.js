import { isEmptyList, isEmptyObject } from '../lib/empty.js'

export async function prepareInterview(vacancy, config, generator) {
  let quizQuestions = []
  let botQuestions = []
  let codingTask

  if (config.type === 'quiz') {
    if (!isEmptyList(vacancy.quizQuestions)) {
      quizQuestions = vacancy.quizQuestions
    } else {
      quizQuestions = await generator.generateQuiz(vacancy, config.questionCount)
    }
  }

  if (config.type === 'bot') {
    if (!isEmptyList(vacancy.botQuestions)) {
      botQuestions = vacancy.botQuestions
    } else {
      botQuestions = await generator.generateBot(vacancy, config.questionCount)
    }
  }

  if (config.enableCoding) {
    if (!isEmptyObject(vacancy.codingTask)) {
      codingTask = vacancy.codingTask
    } else {
      codingTask = await generator.generateCoding(vacancy)
    }
  }

  return { quizQuestions, botQuestions, codingTask }
}
