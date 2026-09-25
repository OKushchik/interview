import { create } from 'zustand'
import type { AuthUser } from '@/types'
import { ApiError } from '@/services/api'
import { authApi } from '@/services/authApi'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

interface AuthState {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  pendingVerificationEmail: string | null
  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: (email: string) => Promise<string>
  forgotPassword: (email: string) => Promise<string>
  resetPassword: (token: string, password: string) => Promise<string>
  changeEmail: (newEmail: string, password: string) => Promise<string>
  verifyEmailChange: (token: string) => Promise<void>
  clearError: () => void
  clearPendingVerification: () => void
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return 'Не вдалося виконати запит. Спробуйте ще раз.'
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,
  pendingVerificationEmail: null,

  clearError: () => set({ error: null }),
  clearPendingVerification: () => set({ pendingVerificationEmail: null }),

  bootstrap: async () => {
    set({ status: 'loading', error: null })
    try {
      const { user } = await authApi.me()
      set({ user, status: 'authenticated' })
    } catch {
      set({ user: null, status: 'anonymous' })
    }
  },

  login: async (email, password) => {
    set({ error: null })
    try {
      const { user } = await authApi.login({ email, password })
      set({
        user,
        status: 'authenticated',
        error: null,
        pendingVerificationEmail: null,
      })
    } catch (error) {
      const pending =
        error instanceof ApiError && error.status === 403 && error.message === 'Email not verified'
          ? email
          : null
      set({
        user: null,
        status: 'anonymous',
        error: toErrorMessage(error),
        pendingVerificationEmail: pending,
      })
      throw error
    }
  },

  register: async (email, password) => {
    set({ error: null })
    try {
      const result = await authApi.register({ email, password })
      set({
        user: null,
        status: 'anonymous',
        error: null,
        pendingVerificationEmail: result.email,
      })
    } catch (error) {
      set({ user: null, status: 'anonymous', error: toErrorMessage(error) })
      throw error
    }
  },

  logout: async () => {
    try {
      await authApi.logout()
    } catch {
      // always clear local session
    }
    set({
      user: null,
      status: 'anonymous',
      error: null,
      pendingVerificationEmail: null,
    })
  },

  verifyEmail: async (token) => {
    set({ error: null })
    try {
      const { user } = await authApi.verifyEmail(token)
      set({
        user,
        status: 'authenticated',
        error: null,
        pendingVerificationEmail: null,
      })
    } catch (error) {
      set({ error: toErrorMessage(error) })
      throw error
    }
  },

  resendVerification: async (email) => {
    const { message } = await authApi.resendVerification(email)
    return message
  },

  forgotPassword: async (email) => {
    const { message } = await authApi.forgotPassword(email)
    return message
  },

  resetPassword: async (token, password) => {
    const { message } = await authApi.resetPassword(token, password)
    return message
  },

  changeEmail: async (newEmail, password) => {
    const { message } = await authApi.changeEmail(newEmail, password)
    try {
      const { user } = await authApi.me()
      set({ user })
    } catch {
      // session may still be valid; pendingEmail will appear after refresh
    }
    return message
  },

  verifyEmailChange: async (token) => {
    set({ error: null })
    try {
      const { user } = await authApi.verifyEmailChange(token)
      set({ user, status: 'authenticated', error: null })
    } catch (error) {
      set({ error: toErrorMessage(error) })
      throw error
    }
  },
}))
