import { useCallback, useEffect, useState } from 'react'
import type { AdminUser, Provider, UserRole } from '@/types'
import { providersApi } from '@/services/providersApi'
import { usersApi } from '@/services/usersApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/utils/errors'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { Select } from '@/components/ui/Select'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'user' },
  { value: 'provider_admin', label: 'provider_admin' },
  { value: 'super_admin', label: 'super_admin' },
]

interface Draft {
  role: UserRole
  providerIds: string[]
}

/** Вкладка «Користувачі»: зміна ролі та прив'язка provider_admin до одного чи кількох провайдерів. */
export function UsersTab() {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [u, p] = await Promise.all([usersApi.list(), providersApi.list()])
      setUsers(u)
      setProviders(p)
      setDrafts({})
    } catch (e) {
      setError(getErrorMessage(e, 'Не вдалося завантажити користувачів'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const draftFor = (u: AdminUser): Draft => drafts[u.id] ?? { role: u.role, providerIds: u.providerIds ?? [] }
  const isDirty = (u: AdminUser) => {
    const d = draftFor(u)
    const same = d.providerIds.length === u.providerIds.length && d.providerIds.every((id) => u.providerIds.includes(id))
    return d.role !== u.role || (d.role === 'provider_admin' && !same)
  }
  const setDraft = (u: AdminUser, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [u.id]: { ...draftFor(u), ...patch } }))

  const save = async (u: AdminUser) => {
    const d = draftFor(u)
    setSavingId(u.id)
    setError(null)
    try {
      const updated = await usersApi.update(u.id, {
        role: d.role,
        ...(d.role === 'provider_admin' ? { providerIds: d.providerIds } : {}),
      })
      setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[u.id]
        return next
      })
    } catch (e) {
      setError(getErrorMessage(e, 'Не вдалося зберегти зміни'))
    } finally {
      setSavingId(null)
    }
  }

  const onDelete = async (u: AdminUser) => {
    const ok = window.confirm(
      `Видалити користувача «${u.email}»? Усі його вакансії та доступи буде видалено безповоротно.`,
    )
    if (!ok) return
    setDeletingId(u.id)
    setError(null)
    try {
      await usersApi.remove(u.id)
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (e) {
      setError(getErrorMessage(e, 'Не вдалося видалити користувача'))
    } finally {
      setDeletingId(null)
    }
  }

  const providerOptions = providers.map((p) => ({ value: p.id, label: p.name }))

  return (
    <Card>
      <h3 className="text-lg font-semibold text-text mb-4">Користувачі</h3>
      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted">Завантаження…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted">Користувачів немає.</p>
      ) : (
        <ul className="divide-y divide-border">
          {users.map((u) => {
            const d = draftFor(u)
            const locked = u.isGuest || u.id === currentUserId
            const needsProvider = d.role === 'provider_admin' && d.providerIds.length === 0
            return (
              <li key={u.id} className="py-4 grid grid-cols-1 lg:grid-cols-[1fr_14rem_auto_auto] gap-3 lg:items-center">
                <div className="min-w-0">
                  <p className="text-sm text-text truncate">{u.email}</p>
                  <div className="flex gap-2 mt-1">
                    {u.isGuest && <Badge>guest</Badge>}
                    {u.id === currentUserId && <Badge variant="primary">це ви</Badge>}
                    {!u.emailVerified && <Badge>email не підтверджено</Badge>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Select
                    aria-label="Роль"
                    value={d.role}
                    options={ROLE_OPTIONS}
                    disabled={locked}
                    onChange={(e) => setDraft(u, { role: e.target.value as UserRole })}
                  />
                  {d.role === 'provider_admin' && (
                    <MultiSelect
                      aria-label="Провайдери"
                      placeholder="Оберіть провайдерів"
                      value={d.providerIds}
                      options={providerOptions}
                      disabled={locked}
                      onChange={(providerIds) => setDraft(u, { providerIds })}
                    />
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => save(u)}
                  disabled={locked || !isDirty(u) || needsProvider || savingId === u.id}
                >
                  {savingId === u.id ? 'Збереження…' : 'Зберегти'}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onDelete(u)}
                  disabled={u.id === currentUserId || deletingId === u.id}
                >
                  {deletingId === u.id ? 'Видалення…' : 'Видалити'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
