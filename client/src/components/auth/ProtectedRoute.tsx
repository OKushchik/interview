import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '@/types'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  /** Якщо задано, доступ лише для цих ролей; інші потрапляють на `/`. */
  roles?: UserRole[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps = {}) {
  const status = useAuthStore((s) => s.status)
  const role = useAuthStore((s) => s.user?.role)
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

  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
