import type { InterviewConfig, Vacancy, VacancyQuestionsJson } from '@/types'

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/** Формує вміст файлу експорту з питань вакансії. */
export function buildQuestionsJson(vacancy: Vacancy): VacancyQuestionsJson {
  return {
    quizQuestions: vacancy.quizQuestions ?? [],
    botQuestions: vacancy.botQuestions ?? [],
    codingTasks: vacancy.codingTasks ?? [],
  }
}

/** Завантажує JSON як файл у браузері. */
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Розбирає й перевіряє текст імпортованого файлу; кидає Error з поясненням українською. */
export function parseQuestionsJson(text: string): VacancyQuestionsJson {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Файл не є коректним JSON')
  }
  if (!isObject(data)) {
    throw new Error('Очікується JSON-об’єкт з полями quizQuestions, botQuestions, codingTasks')
  }

  const list = (key: string, check: (item: unknown) => boolean): unknown[] | undefined => {
    const value = data[key]
    if (value == null) return undefined
    if (!Array.isArray(value)) throw new Error(`Поле ${key} має бути масивом`)
    value.forEach((item, i) => {
      if (!check(item)) throw new Error(`Некоректний елемент ${key}[${i}]`)
    })
    return value
  }

  const quizQuestions = list('quizQuestions', (q) =>
    isObject(q) && isText(q.question) && Array.isArray(q.options) && q.options.length === 4 && q.options.every(isText)
    && Number.isInteger(q.correctIndex) && (q.correctIndex as number) >= 0 && (q.correctIndex as number) <= 3)
  const botQuestions = list('botQuestions', (q) => isObject(q) && isText(q.question))
  const codingTasks = list('codingTasks', (t) =>
    isObject(t) && isText(t.title) && isText(t.description) && typeof t.starterCode === 'string')

  if (!quizQuestions?.length && !botQuestions?.length && !codingTasks?.length) {
    throw new Error('У файлі немає жодного питання')
  }
  return { quizQuestions, botQuestions, codingTasks } as VacancyQuestionsJson
}

/**
 * Підганяє збережену конфігурацію під кількість імпортованих питань,
 * інакше сервер вважав би їх невідповідними і згенерував нові.
 */
export function alignConfig(config: InterviewConfig | null | undefined, questions: VacancyQuestionsJson): InterviewConfig | undefined {
  if (!config) return undefined
  const clamp = (n: number) => Math.min(20, Math.max(1, n))
  const count = questions.quizQuestions?.length || questions.botQuestions?.length
  const coding = questions.codingTasks?.length
  return {
    ...config,
    questionCount: count ? clamp(count) : config.questionCount,
    ...(coding ? { enableCoding: true, codingCount: clamp(coding) } : {}),
  }
}
