import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const verifyEmail = useAuthStore((s) => s.verifyEmail)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setError('Лінк недійсний або застарів')
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await verifyEmail(token)
        if (!cancelled) navigate('/vacancies', { replace: true })
      } catch {
        if (!cancelled) setError('Лінк недійсний або застарів')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params, verifyEmail, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 space-y-4 text-center">
        <h1 className="text-xl font-bold gradient-text">Підтвердження email</h1>
        {loading && <p className="text-muted">Перевіряємо лінк…</p>}
        {error && (
          <>
            <p className="text-red-400" role="alert">
              {error}
            </p>
            <Link to="/login" className="text-cyan hover:underline text-sm">
              Повернутися до входу
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
