import { FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const resetPassword = useAuthStore((s) => s.resetPassword)
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Лінк недійсний або застарів')
      return
    }
    if (password.length < 8) {
      setError('Пароль має містити щонайменше 8 символів')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await resetPassword(token, password)
      navigate('/login', { replace: true })
    } catch {
      setError('Лінк недійсний або застарів')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold gradient-text">Новий пароль</h1>
          <p className="text-sm text-muted">Пароль змінено — потім увійдіть з новим паролем</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label="Новий пароль"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="мінімум 8 символів"
          />
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting || !token}>
            {submitting ? 'Зачекайте…' : 'Зберегти пароль'}
          </Button>
        </form>

        <Link to="/login" className="block text-center text-sm text-cyan hover:underline">
          Назад до входу
        </Link>
      </div>
    </div>
  )
}
