import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'

export function ForgotPasswordPage() {
  const forgotPassword = useAuthStore((s) => s.forgotPassword)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await forgotPassword(email.trim())
      setMessage('Якщо акаунт існує, ми надіслали інструкції')
    } catch {
      setError('Не вдалося надіслати лист. Спробуйте ще раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold gradient-text">Відновлення пароля</h1>
          <p className="text-sm text-muted">Вкажіть email акаунту</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {message && <p className="text-sm text-cyan">{message}</p>}
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Зачекайте…' : 'Надіслати лінк'}
          </Button>
        </form>

        <Link to="/login" className="block text-center text-sm text-cyan hover:underline">
          Назад до входу
        </Link>
      </div>
    </div>
  )
}
