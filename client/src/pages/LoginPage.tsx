import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brain, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { RegisterRole } from '@/types'
import { useAuthStore } from '@/store/authStore'

type Mode = 'login' | 'register'

function PasswordVisibilityButton({
  visible,
  onToggle,
}: {
  visible: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="text-muted hover:text-text transition-colors"
      aria-label={visible ? 'Приховати пароль' : 'Показати пароль'}
      aria-pressed={visible}
    >
      {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
    </button>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const pendingVerificationEmail = useAuthStore((s) => s.pendingVerificationEmail)
  const resendVerification = useAuthStore((s) => s.resendVerification)

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [role, setRole] = useState<RegisterRole>('candidate')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    clearError()
    setLocalError(null)
    setResendMessage(null)
    setPasswordConfirm('')
    setShowPassword(false)
    setShowPasswordConfirm(false)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()
    setResendMessage(null)

    if (password.length < 8) {
      setLocalError('Пароль має містити щонайменше 8 символів')
      return
    }

    if (mode === 'register' && password !== passwordConfirm) {
      setLocalError('Паролі не збігаються')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email.trim(), password)
        navigate('/vacancies', { replace: true })
      } else {
        await register(email.trim(), password, role)
      }
    } catch {
      // error already in store
    } finally {
      setSubmitting(false)
    }
  }

  const onGuest = async () => {
    setLocalError(null)
    clearError()
    setSubmitting(true)
    try {
      await loginAsGuest()
      navigate('/vacancies', { replace: true })
    } catch {
      // error already in store
    } finally {
      setSubmitting(false)
    }
  }

  const onResend = async () => {
    if (!pendingVerificationEmail) return
    setResending(true)
    setResendMessage(null)
    try {
      const message = await resendVerification(pendingVerificationEmail)
      setResendMessage(
        message === 'If an account exists, a verification email was sent'
          ? 'Якщо акаунт існує, ми надіслали лист підтвердження'
          : message,
      )
    } catch {
      setResendMessage('Не вдалося надіслати лист. Спробуйте ще раз.')
    } finally {
      setResending(false)
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

        {pendingVerificationEmail && (
          <div className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 space-y-2 text-sm">
            <p className="text-text">
              Підтвердіть email. Ми надіслали лист на{' '}
              <span className="font-medium">{pendingVerificationEmail}</span>
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={onResend} disabled={resending}>
              {resending ? 'Надсилаємо…' : 'Надіслати ще раз'}
            </Button>
            {resendMessage && <p className="text-muted">{resendMessage}</p>}
          </div>
        )}

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
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="мінімум 8 символів"
            trailing={
              <PasswordVisibilityButton
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />
            }
          />

          {mode === 'register' && (
            <Input
              label="Підтвердження пароля"
              type={showPasswordConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="повторіть пароль"
              trailing={
                <PasswordVisibilityButton
                  visible={showPasswordConfirm}
                  onToggle={() => setShowPasswordConfirm((v) => !v)}
                />
              }
            />
          )}

          {mode === 'register' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text">Роль</p>
              <div className="flex rounded-xl bg-background/50 p-1 border border-border">
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                    role === 'recruiter' ? 'bg-surface text-text' : 'text-muted hover:text-text'
                  }`}
                  aria-pressed={role === 'recruiter'}
                  onClick={() => setRole('recruiter')}
                >
                  Створення вакансій
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                    role === 'candidate' ? 'bg-surface text-text' : 'text-muted hover:text-text'
                  }`}
                  aria-pressed={role === 'candidate'}
                  onClick={() => setRole('candidate')}
                >
                  Кандидат
                </button>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-cyan hover:underline">
                Забули пароль?
              </Link>
            </div>
          )}

          {displayError && (
            <p className="text-sm text-red-400" role="alert">
              {displayError === 'Email not verified'
                ? 'Email не підтверджено. Перевірте пошту або надішліть лист ще раз.'
                : displayError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Зачекайте…' : mode === 'login' ? 'Увійти' : 'Зареєструватися'}
          </Button>

          {mode === 'login' && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={submitting}
              onClick={onGuest}
            >
              Увійти як гість
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}
