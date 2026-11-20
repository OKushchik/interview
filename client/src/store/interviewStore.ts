import { create } from 'zustand'
import type { InterviewState } from '@/types'

export const useInterviewStore = create<InterviewState>((set, get) => ({
  currentSession: null,
  report: null,
  isGenerating: false,

  startSession: (vacancy, config) => {
    set({
      currentSession: {
        vacancy,
        config,
        quizQuestions: [],
        botQuestions: [],
        codingTasks: [],
        quizAnswers: [],
        botAnswers: [],
        codingAnswers: [],
      },
      report: null,
    })
  },

  setSession: (session) => set({ currentSession: session }),

  setGenerating: (value) => set({ isGenerating: value }),

  saveQuizAnswer: (answer) => {
    const session = get().currentSession
    if (!session) return
    const filtered = session.quizAnswers.filter((a) => a.questionId !== answer.questionId)
    set({
      currentSession: {
        ...session,
        quizAnswers: [...filtered, answer],
      },
    })
  },

  saveBotAnswer: (answer) => {
    const session = get().currentSession
    if (!session) return
    const filtered = session.botAnswers.filter((a) => a.questionId !== answer.questionId)
    set({
      currentSession: {
        ...session,
        botAnswers: [...filtered, answer],
      },
    })
  },

  saveCodingAnswer: (answer) => {
    const session = get().currentSession
    if (!session) return
    const filtered = session.codingAnswers.filter((a) => a.taskId !== answer.taskId)
    set({ currentSession: { ...session, codingAnswers: [...filtered, answer] } })
  },

  setReport: (report) => set({ report }),

  reset: () => set({ currentSession: null, report: null, isGenerating: false }),
}))
