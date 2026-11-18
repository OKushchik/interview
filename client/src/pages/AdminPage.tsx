import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { ProvidersTab } from '@/components/admin/ProvidersTab'
import { UsersTab } from '@/components/admin/UsersTab'
import { AccessTab } from '@/components/admin/AccessTab'

type AdminTab = 'providers' | 'users' | 'access'

const TABS: { value: AdminTab; label: string }[] = [
  { value: 'providers', label: 'Провайдери' },
  { value: 'users', label: 'Користувачі' },
  { value: 'access', label: 'Доступи' },
]

/** Адмін-панель super_admin: провайдери, користувачі, доступи. */
export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('providers')

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-3xl font-bold gradient-text mb-6">Адмін-панель</h2>

        <div className="flex gap-2 mb-6 border-b border-border" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.value
                  ? 'border-primary text-text'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'providers' && <ProvidersTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'access' && <AccessTab />}
      </main>
    </div>
  )
}
