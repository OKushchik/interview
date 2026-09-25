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
            <Link
              to="/account"
              className="text-sm text-muted hidden sm:block truncate max-w-[180px] hover:text-text"
              title={user.email}
            >
              {user.email}
            </Link>
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
