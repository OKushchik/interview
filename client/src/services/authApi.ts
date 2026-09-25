import type { AuthUser } from '@/types'
import { apiRequest } from './api'

export type AuthCredentials = { email: string; password: string }

export const authApi = {
  login(credentials: AuthCredentials) {
    return apiRequest<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },
  register(credentials: AuthCredentials) {
    return apiRequest<{ message: string; email: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },
  logout() {
    return apiRequest<void>('/api/auth/logout', { method: 'POST' })
  },
  me() {
    return apiRequest<{ user: AuthUser }>('/api/auth/me')
  },
  verifyEmail(token: string) {
    return apiRequest<{ user: AuthUser }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },
  resendVerification(email: string) {
    return apiRequest<{ message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },
  forgotPassword(email: string) {
    return apiRequest<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },
  resetPassword(token: string, password: string) {
    return apiRequest<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  },
  changeEmail(newEmail: string, password: string) {
    return apiRequest<{ message: string }>('/api/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ newEmail, password }),
    })
  },
  verifyEmailChange(token: string) {
    return apiRequest<{ user: AuthUser }>('/api/auth/verify-email-change', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },
}
