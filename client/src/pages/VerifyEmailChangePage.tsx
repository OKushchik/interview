import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function VerifyEmailChangePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const verifyEmailChange = useAuthStore((s) => s.verifyEmailChange)
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
        await verifyEmailChange(token)
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
  }, [params, verifyEmailChange, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 space-y-4 text-center">
        <h1 className="text-xl font-bold gradient-text">Підтвердження нового email</h1>
        {loading && <p className="text-muted">Оновлюємо адресу…</p>}
        {error && (
          <>
            <p className="text-red-400" role="alert">
              {error}
            </p>
            <Link to="/account" className="text-cyan hover:underline text-sm">
              До акаунту
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
