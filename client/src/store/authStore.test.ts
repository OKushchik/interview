import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/authApi', () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    verifyEmail: vi.fn(),
    resendVerification: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changeEmail: vi.fn(),
    verifyEmailChange: vi.fn(),
  },
}))

import { authApi } from '@/services/authApi'
import { useAuthStore } from './authStore'

const sampleUser = {
  id: 'u1',
  email: 'a@b.c',
  role: 'candidate' as const,
  pendingEmail: null,
  vacancies: [],
}

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      status: 'idle',
      error: null,
      pendingVerificationEmail: null,
    })
    vi.clearAllMocks()
  })

  it('bootstrap sets authenticated when /me succeeds', async () => {
    vi.mocked(authApi.me).mockResolvedValue({ user: sampleUser })

    await useAuthStore.getState().bootstrap()

    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      user: { email: 'a@b.c' },
    })
  })

  it('bootstrap sets anonymous when /me fails', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Unauthorized'))

    await useAuthStore.getState().bootstrap()

    expect(useAuthStore.getState()).toMatchObject({
      status: 'anonymous',
      user: null,
    })
  })

  it('login stores user and clears error', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ user: sampleUser })

    await useAuthStore.getState().login('a@b.c', 'password1')

    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      user: { email: 'a@b.c' },
      error: null,
    })
  })

  it('login stores API error message', async () => {
    const { ApiError } = await import('@/services/api')
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(401, 'Invalid email or password'))

    await expect(useAuthStore.getState().login('a@b.c', 'bad')).rejects.toBeTruthy()
    expect(useAuthStore.getState().error).toBe('Invalid email or password')
    expect(useAuthStore.getState().status).toBe('anonymous')
  })

  it('register sets pendingVerificationEmail and stays anonymous', async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      message: 'Check your email',
      email: 'a@b.c',
    })
    await useAuthStore.getState().register('a@b.c', 'password1')
    expect(useAuthStore.getState()).toMatchObject({
      status: 'anonymous',
      user: null,
      pendingVerificationEmail: 'a@b.c',
    })
  })

  it('login 403 Email not verified sets pendingVerificationEmail', async () => {
    const { ApiError } = await import('@/services/api')
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(403, 'Email not verified'))
    await expect(useAuthStore.getState().login('a@b.c', 'password1')).rejects.toBeTruthy()
    expect(useAuthStore.getState().pendingVerificationEmail).toBe('a@b.c')
  })
})
