import { useCallback, useEffect, useState } from 'react'
import type { AccessEntry, AdminUser, Provider } from '@/types'
import { accessApi } from '@/services/accessApi'
import { providersApi } from '@/services/providersApi'
import { usersApi } from '@/services/usersApi'
import { getErrorMessage } from '@/utils/errors'
import { AccessList } from '@/components/admin/AccessList'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'

/** Вкладка «Доступи»: видати користувачу доступ до будь-якого провайдера. */
export function AccessTab() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [slug, setSlug] = useState('')
  const [userId, setUserId] = useState('')
  const [entries, setEntries] = useState<AccessEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([providersApi.list(), usersApi.list()])
      .then(([p, u]) => {
        setProviders(p)
        // Перегляд можна дати і звичайним користувачам, і адмінам інших провайдерів.
        setUsers(u.filter((x) => (x.role === 'user' || x.role === 'provider_admin') && !x.isGuest))
        setSlug((current) => current || p[0]?.slug || '')
      })
      .catch((e) => setError(getErrorMessage(e, 'Не вдалося завантажити дані')))
  }, [])

  const loadEntries = useCallback(async (value: string) => {
    if (!value) {
      setEntries([])
      return
    }
    try {
      setEntries(await accessApi.list(value))
    } catch (e) {
      setError(getErrorMessage(e, 'Не вдалося завантажити доступи'))
    }
  }, [])

  useEffect(() => {
    void loadEntries(slug)
  }, [slug, loadEntries])

  const grant = async () => {
    if (!slug || !userId) return
    setBusy(true)
    setError(null)
    try {
      await accessApi.grant(slug, { userId })
      setUserId('')
      await loadEntries(slug)
    } catch (e) {
      setError(getErrorMessage(e, 'Не вдалося видати доступ'))
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (entry: AccessEntry) => {
    setRevokingId(entry.userId)
    setError(null)
    try {
      await accessApi.revoke(slug, entry.userId)
      await loadEntries(slug)
    } catch (e) {
      setError(getErrorMessage(e, 'Не вдалося відкликати доступ'))
    } finally {
      setRevokingId(null)
    }
  }

  if (providers.length === 0 && !error) {
    return (
      <Card>
        <p className="text-sm text-muted">Спершу створіть провайдера на вкладці «Провайдери».</p>
      </Card>
    )
  }

  const granted = new Set(entries.map((e) => e.userId))
  const providerId = providers.find((p) => p.slug === slug)?.id
  // Адміна, який уже керує цим провайдером, у списку не показуємо.
  const candidates = users.filter((u) => !granted.has(u.id) && !(providerId && u.providerIds.includes(providerId)))
  const userOptions = [
    { value: '', label: 'Оберіть користувача' },
    ...candidates.map((u) => ({ value: u.id, label: u.role === 'provider_admin' ? `${u.email} (адмін)` : u.email })),
  ]

  return (
    <Card className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 sm:items-end">
        <Select
          label="Провайдер"
          value={slug}
          options={providers.map((p) => ({ value: p.slug, label: p.name }))}
          onChange={(e) => setSlug(e.target.value)}
        />
        <Select
          label="Користувач"
          value={userId}
          options={userOptions}
          onChange={(e) => setUserId(e.target.value)}
        />
        <Button onClick={grant} disabled={busy || !slug || !userId}>
          Видати доступ
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div>
        <h3 className="text-sm font-medium text-muted mb-2">Мають доступ</h3>
        <AccessList entries={entries} onRevoke={revoke} busyUserId={revokingId} />
      </div>
    </Card>
  )
}
