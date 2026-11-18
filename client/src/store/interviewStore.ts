import { create } from 'zustand'
import type { InterviewState, Vacancy } from '@/types'

export const useInterviewStore = create<InterviewState>((set, get) => ({
  customVacancies: [],
  currentSession: null,
  report: null,
  isGenerating: false,

  addCustomVacancy: (form) => {
    const vacancy: Vacancy = {
      id: `custom-${Date.now()}`,
      title: form.title,
      level: form.level,
      skills: form.skills,
      description: `Кастомна вакансія: ${form.title} (${form.level})`,
      isCustom: true,
    }
    set((state) => ({ customVacancies: [...state.customVacancies, vacancy] }))
    return vacancy
  },

  startSession: (vacancy, config) => {
    set({
      currentSession: {
        vacancy,
        config,
        quizQuestions: [],
        botQuestions: [],
        quizAnswers: [],
        botAnswers: [],
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
    set({ currentSession: { ...session, codingAnswer: answer } })
  },

  setReport: (report) => set({ report }),

  reset: () => set({ currentSession: null, report: null, isGenerating: false }),
}))
