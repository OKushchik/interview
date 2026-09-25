# Client Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Додати на клієнті повний цикл login/register/logout/`me` з захистом усіх роутів поверх існуючого Express auth API (httpOnly JWT cookie).

**Architecture:** Thin `api`/`authApi` клієнти з `credentials: 'include'`, Zustand `authStore` для сесії, `ProtectedRoute` + публічний `/login` з табами Вхід/Реєстрація. Токен у клієнті не зберігається.

**Tech Stack:** React 19, React Router 7, Zustand 5, Vite 6 proxy, Vitest, існуючі `Input`/`Button` UI.

## Global Constraints

- Не змінювати бекенд-контракт `/api/auth/*` і cookie `access_token`
- Не зберігати JWT у `localStorage` / Zustand
- Українська UI-копія на Login/Header
- Пароль мінімум 8 символів (як `registerSchema` на сервері)
- Proxy `/api` → `http://localhost:3001` у `client/vite.config.ts`
- Не чіпати vacancies/interview data flows поза auth-гардом
- Коміти лише якщо в репо є git і користувач не заборонив; інакше пропустити commit-кроки

---

## File map

| File | Role |
|------|------|
| `client/src/types/index.ts` | додати `AuthUser` |
| `client/src/services/api.ts` | generic fetch + `ApiError` |
| `client/src/services/authApi.ts` | login/register/logout/me |
| `client/src/store/authStore.ts` | session state + actions |
| `client/src/pages/LoginPage.tsx` | auth form UI |
| `client/src/components/auth/ProtectedRoute.tsx` | bootstrap + redirect |
| `client/src/components/auth/GuestRoute.tsx` | redirect authenticated away from `/login` |
| `client/src/App.tsx` | wiring routes |
| `client/src/components/layout/Header.tsx` | email + logout |
| `client/vite.config.ts` | `/api` proxy |
| `client/src/services/api.test.ts` | unit tests for API helper |
| `client/src/store/authStore.test.ts` | unit tests for store actions |

---

### Task 1: Types + API client + Vite proxy

**Files:**
- Modify: `client/src/types/index.ts`
- Create: `client/src/services/api.ts`
- Create: `client/src/services/api.test.ts`
- Create: `client/src/services/authApi.ts`
- Modify: `client/vite.config.ts`

**Interfaces:**
- Consumes: існуючий Vitest setup у `client/package.json` (`vitest run`)
- Produces:
  - `AuthUser = { id: string; email: string; vacancies: unknown[] }`
  - `class ApiError extends Error { status: number; body?: { error?: string } }`
  - `apiRequest<T>(path: string, init?: RequestInit): Promise<T>`
  - `authApi.login/register/logout/me`

- [ ] **Step 1: Write failing tests for `apiRequest`**

Create `client/src/services/api.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from './api'

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns JSON on success with credentials include', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ user: { id: '1', email: 'a@b.c' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const data = await apiRequest<{ user: { id: string } }>('/api/auth/me')
    expect(data.user.id).toBe('1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('throws ApiError with server message on 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Unauthorized' }),
      }),
    )

    await expect(apiRequest('/api/auth/me')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Unauthorized',
    } satisfies Partial<ApiError>)
  })

  it('returns undefined body for 204', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: { get: () => null },
      }),
    )

    await expect(apiRequest('/api/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd client && npm test -- src/services/api.test.ts`

Expected: FAIL (module `./api` not found or exports missing)

- [ ] **Step 3: Add `AuthUser` type**

Append to `client/src/types/index.ts`:

```ts
export interface AuthUser {
  id: string
  email: string
  vacancies: unknown[]
}
```

- [ ] **Step 4: Implement `api.ts`**

Create `client/src/services/api.ts`:

```ts
export class ApiError extends Error {
  status: number
  body?: { error?: string }

  constructor(status: number, message: string, body?: { error?: string }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (res.status === 204) {
    return undefined as T
  }

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json() : undefined

  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : null) ?? 'Сталася помилка запиту'
    throw new ApiError(res.status, message, body)
  }

  return body as T
}
```

- [ ] **Step 5: Implement `authApi.ts`**

Create `client/src/services/authApi.ts`:

```ts
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
    return apiRequest<{ user: AuthUser }>('/api/auth/register', {
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
}
```

- [ ] **Step 6: Add Vite proxy**

In `client/vite.config.ts`, add `server.proxy` inside `defineConfig({...})`:

```ts
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
```

- [ ] **Step 7: Run tests — expect PASS**

Run: `cd client && npm test -- src/services/api.test.ts`

Expected: PASS (3 tests)

- [ ] **Step 8: Commit (if git available)**

```bash
git add client/src/types/index.ts client/src/services/api.ts client/src/services/api.test.ts client/src/services/authApi.ts client/vite.config.ts
git commit -m "feat(client): add auth API client and Vite /api proxy"
```

---

### Task 2: Auth Zustand store

**Files:**
- Create: `client/src/store/authStore.ts`
- Create: `client/src/store/authStore.test.ts`

**Interfaces:**
- Consumes: `authApi`, `ApiError`, `AuthUser`
- Produces: `useAuthStore` with:
  - `user: AuthUser | null`
  - `status: 'idle' | 'loading' | 'authenticated' | 'anonymous'`
  - `error: string | null`
  - `bootstrap(): Promise<void>`
  - `login(email, password): Promise<void>`
  - `register(email, password): Promise<void>`
  - `logout(): Promise<void>`
  - `clearError(): void`

- [ ] **Step 1: Write failing store tests**

Create `client/src/store/authStore.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/authApi', () => ({
  authApi: {
    me: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}))

import { authApi } from '@/services/authApi'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      status: 'idle',
      error: null,
    })
    vi.clearAllMocks()
  })

  it('bootstrap sets authenticated when /me succeeds', async () => {
    vi.mocked(authApi.me).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c', vacancies: [] },
    })

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
    vi.mocked(authApi.login).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.c', vacancies: [] },
    })

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
})
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd client && npm test -- src/store/authStore.test.ts`

Expected: FAIL (store missing)

- [ ] **Step 3: Implement `authStore.ts`**

Create `client/src/store/authStore.ts`:

```ts
import { create } from 'zustand'
import type { AuthUser } from '@/types'
import { ApiError } from '@/services/api'
import { authApi } from '@/services/authApi'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'anonymous'

interface AuthState {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  bootstrap: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
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

  clearError: () => set({ error: null }),

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
      set({ user, status: 'authenticated', error: null })
    } catch (error) {
      set({ user: null, status: 'anonymous', error: toErrorMessage(error) })
      throw error
    }
  },

  register: async (email, password) => {
    set({ error: null })
    try {
      const { user } = await authApi.register({ email, password })
      set({ user, status: 'authenticated', error: null })
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
    set({ user: null, status: 'anonymous', error: null })
  },
}))
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd client && npm test -- src/store/authStore.test.ts`

Expected: PASS

- [ ] **Step 5: Commit (if git available)**

```bash
git add client/src/store/authStore.ts client/src/store/authStore.test.ts
git commit -m "feat(client): add auth Zustand store"
```

---

### Task 3: Login page + route guards

**Files:**
- Create: `client/src/pages/LoginPage.tsx`
- Create: `client/src/components/auth/ProtectedRoute.tsx`
- Create: `client/src/components/auth/GuestRoute.tsx`
- Modify: `client/src/App.tsx`

**Interfaces:**
- Consumes: `useAuthStore`, `Input`, `Button`
- Produces: `LoginPage`, `ProtectedRoute`, `GuestRoute`; routes wired in `App`

- [ ] **Step 1: Implement `ProtectedRoute`**

Create `client/src/components/auth/ProtectedRoute.tsx`:

```tsx
import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute() {
  const status = useAuthStore((s) => s.status)
  const bootstrap = useAuthStore((s) => s.bootstrap)

  useEffect(() => {
    if (status === 'idle') {
      void bootstrap()
    }
  }, [status, bootstrap])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted">
        Завантаження…
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
```

- [ ] **Step 2: Implement `GuestRoute`**

Create `client/src/components/auth/GuestRoute.tsx`:

```tsx
import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function GuestRoute() {
  const status = useAuthStore((s) => s.status)
  const bootstrap = useAuthStore((s) => s.bootstrap)

  useEffect(() => {
    if (status === 'idle') {
      void bootstrap()
    }
  }, [status, bootstrap])

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted">
        Завантаження…
      </div>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/vacancies" replace />
  }

  return <Outlet />
}
```

- [ ] **Step 3: Implement `LoginPage`**

Create `client/src/pages/LoginPage.tsx`:

```tsx
import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'

type Mode = 'login' | 'register'

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const switchMode = (next: Mode) => {
    setMode(next)
    clearError()
    setLocalError(null)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()

    if (password.length < 8) {
      setLocalError('Пароль має містити щонайменше 8 символів')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
      } else {
        await register(email.trim(), password)
      }
      navigate('/vacancies', { replace: true })
    } catch {
      // error already in store
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = localError ?? error

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="p-2 rounded-xl bg-gradient-to-br from-primary to-cyan">
            <Brain size={24} className="text-white" />
          </span>
          <div>
            <h1 className="text-xl font-bold gradient-text">AI Interview Simulator</h1>
            <p className="text-sm text-muted mt-1">
              {mode === 'login' ? 'Увійдіть у свій акаунт' : 'Створіть новий акаунт'}
            </p>
          </div>
        </div>

        <div className="flex rounded-xl bg-background/50 p-1 border border-border">
          <button
            type="button"
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              mode === 'login' ? 'bg-surface text-text' : 'text-muted hover:text-text'
            }`}
            onClick={() => switchMode('login')}
          >
            Вхід
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
              mode === 'register' ? 'bg-surface text-text' : 'text-muted hover:text-text'
            }`}
            onClick={() => switchMode('register')}
          >
            Реєстрація
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Input
            label="Пароль"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="мінімум 8 символів"
          />

          {displayError && (
            <p className="text-sm text-red-400" role="alert">
              {displayError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Зачекайте…' : mode === 'login' ? 'Увійти' : 'Зареєструватися'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire routes in `App.tsx`**

Replace `client/src/App.tsx` with:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { VacanciesPage } from '@/pages/VacanciesPage'
import { InterviewPage } from '@/pages/InterviewPage'
import { ReportPage } from '@/pages/ReportPage'
import { LoginPage } from '@/pages/LoginPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { GuestRoute } from '@/components/auth/GuestRoute'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/vacancies" replace />} />
          <Route path="/vacancies" element={<VacanciesPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/vacancies" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Typecheck**

Run: `cd client && npx tsc -b --pretty false`

Expected: no errors related to new auth files

- [ ] **Step 6: Commit (if git available)**

```bash
git add client/src/pages/LoginPage.tsx client/src/components/auth client/src/App.tsx
git commit -m "feat(client): add login page and auth route guards"
```

---

### Task 4: Header logout + manual verification

**Files:**
- Modify: `client/src/components/layout/Header.tsx`

**Interfaces:**
- Consumes: `useAuthStore.user`, `useAuthStore.logout`
- Produces: email display + logout button navigating to `/login`

- [ ] **Step 1: Update Header**

Modify `client/src/components/layout/Header.tsx` to import `useNavigate`, `LogOut` from lucide, `useAuthStore`, and add email + logout next to theme toggle:

```tsx
import { Link, useNavigate } from 'react-router-dom'
import { Brain, Sun, Moon, LogOut } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'

export function Header() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const isDark = theme === 'dark'

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link to="/vacancies" className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-gradient-to-br from-primary to-cyan">
            <Brain size={24} className="text-white" />
          </span>
          <span>
            <h1 className="text-lg font-bold gradient-text">AI Interview Simulator</h1>
            <p className="text-xs text-muted">Автоматизовані технічні співбесіди</p>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user?.email && (
            <span className="text-sm text-muted hidden sm:block truncate max-w-[180px]" title={user.email}>
              {user.email}
            </span>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-muted hover:text-text hover:bg-hover-strong transition-colors"
            title={isDark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
            aria-label={isDark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Button variant="ghost" size="sm" onClick={onLogout} aria-label="Вийти">
            <LogOut size={16} />
            <span className="hidden sm:inline">Вийти</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Run all client unit tests**

Run: `cd client && npm test`

Expected: all PASS (including previous `parseLlmJson` + new auth tests)

- [ ] **Step 3: Manual E2E check (server + client)**

Terminal A: `cd server && npm run dev` (or project’s server start script) — API on `:3001`  
Terminal B: `cd client && npm run dev` — app on `:5173`

Checklist:
1. Open `/vacancies` without cookie → redirect `/login`
2. Register new email/password (≥8) → `/vacancies`, email in Header
3. Reload → stays authenticated
4. Logout → `/login`; open `/interview` → back to `/login`
5. Login with wrong password → error under form
6. Login with correct password → `/vacancies`

- [ ] **Step 4: Commit (if git available)**

```bash
git add client/src/components/layout/Header.tsx
git commit -m "feat(client): show user email and logout in header"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| api + authApi + credentials | Task 1 |
| Vite `/api` proxy | Task 1 |
| authStore statuses + actions | Task 2 |
| `/login` with tabs | Task 3 |
| Protected + guest redirects | Task 3 |
| Header email + logout | Task 4 |
| Manual test plan | Task 4 Step 3 |
| No backend changes / no OAuth | Global Constraints |

## Placeholder / consistency self-check

- Немає TBD
- Імена `bootstrap/login/register/logout/clearError` узгоджені між Task 2–4
- `AuthUser` визначений у Task 1 і використовується в Task 2
