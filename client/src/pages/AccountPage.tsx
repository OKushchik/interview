import { FormEvent, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/authStore'

export function AccountPage() {
  const user = useAuthStore((s) => s.user)
  const changeEmail = useAuthStore((s) => s.changeEmail)

  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await changeEmail(newEmail.trim(), password)
      setMessage('Перевірте новий email і підтвердіть зміну за лінком у листі')
      setNewEmail('')
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося змінити email')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Акаунт</h1>
          <p className="text-sm text-muted mt-1">Поточний email: {user?.email}</p>
        </div>

        {user?.pendingEmail && (
          <div className="rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm">
            Підтвердіть новий email: <span className="font-medium">{user.pendingEmail}</span>
          </div>
        )}

        <form className="glass-card rounded-2xl p-6 space-y-4" onSubmit={onSubmit}>
          <h2 className="font-semibold text-text">Змінити email</h2>
          <Input
            label="Новий email"
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <Input
            label="Поточний пароль"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {message && <p className="text-sm text-cyan">{message}</p>}
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Зачекайте…' : 'Надіслати підтвердження'}
          </Button>
        </form>
      </main>
    </div>
  )
}
