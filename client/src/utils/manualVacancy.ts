import type { BotDraft, CodingDraft, ManualDrafts, ManualSection, QuizDraft, Vacancy } from '@/types'

const blank = (v: string) => v.trim().length === 0

export const emptyQuiz = (): QuizDraft => ({ question: '', options: ['', '', '', ''], correctIndex: 0 })
export const emptyBot = (): BotDraft => ({ question: '' })
export const emptyCoding = (): CodingDraft => ({ title: '', description: '', starterCode: '' })

export const EMPTY_FACTORIES = { quiz: emptyQuiz, bot: emptyBot, coding: emptyCoding }

export const createEmptyDrafts = (): ManualDrafts => ({
  quiz: [emptyQuiz()],
  bot: [emptyBot()],
  coding: [emptyCoding()],
})

type Draft = QuizDraft | BotDraft | CodingDraft

/** Whether the draft has no fields filled in (correctIndex is not counted). */
export function isDraftEmpty(section: ManualSection, d: Draft): boolean {
  if (section === 'quiz') {
    const q = d as QuizDraft
    return blank(q.question) && q.options.every(blank)
  }
  if (section === 'bot') return blank((d as BotDraft).question)
  const c = d as CodingDraft
  return blank(c.title) && blank(c.description) && blank(c.starterCode)
}

/** Whether all required fields are filled in (starterCode is optional). */
export function isDraftComplete(section: ManualSection, d: Draft): boolean {
  if (section === 'quiz') {
    const q = d as QuizDraft
    return !blank(q.question) && q.options.every((o) => !blank(o))
  }
  if (section === 'bot') return !blank((d as BotDraft).question)
  const c = d as CodingDraft
  return !blank(c.title) && !blank(c.description)
}

/** Index of the first partially filled draft, or -1. */
export const findPartialIndex = (section: ManualSection, list: Draft[]) =>
  list.findIndex((d) => !isDraftEmpty(section, d) && !isDraftComplete(section, d))

/** Only fully filled drafts, trimmed; an empty list - the section will not exist. */
export function cleanDrafts(drafts: ManualDrafts) {
  const quiz = drafts.quiz
    .filter((d) => isDraftComplete('quiz', d))
    .map((d) => ({ question: d.question.trim(), options: d.options.map((o) => o.trim()), correctIndex: d.correctIndex }))
  const bot = drafts.bot.filter((d) => isDraftComplete('bot', d)).map((d) => ({ question: d.question.trim() }))
  const coding = drafts.coding
    .filter((d) => isDraftComplete('coding', d))
    .map((d) => ({ title: d.title.trim(), description: d.description.trim(), starterCode: d.starterCode }))
  return { quiz, bot, coding }
}

/**
 * A vacancy is manually created if it has questions but no interview configuration:
 * AI generates questions only for a saved configuration.
 */
export function isManualVacancy(v: Vacancy): boolean {
  if (v.interviewConfig) return false
  return Boolean(v.quizQuestions?.length || v.botQuestions?.length || v.codingTasks?.length)
}

/** Drafts for editing; an empty section gets one empty draft. */
export function draftsFromVacancy(v: Vacancy): ManualDrafts {
  const quiz = (v.quizQuestions ?? []).map((q) => ({ question: q.question, options: [...q.options], correctIndex: q.correctIndex }))
  const bot = (v.botQuestions ?? []).map((q) => ({ question: q.question }))
  const coding = (v.codingTasks ?? []).map((t) => ({ title: t.title, description: t.description, starterCode: t.starterCode }))
  return {
    quiz: quiz.length ? quiz : [emptyQuiz()],
    bot: bot.length ? bot : [emptyBot()],
    coding: coding.length ? coding : [emptyCoding()],
  }
}
