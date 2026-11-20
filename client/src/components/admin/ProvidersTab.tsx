import { FormEvent, useCallback, useEffect, useState } from 'react'
import type { Provider } from '@/types'
import { providersApi } from '@/services/providersApi'
import { useAuthStore } from '@/store/authStore'
import { getErrorMessage } from '@/utils/errors'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

/** 'Providers' tab: creation and list. */
export function ProvidersTab() {
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setProviders(await providersApi.list())
    } catch (e) {
      setError(getErrorMessage(e, 'Не вдалося завантажити провайдерів'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await providersApi.create({ name: name.trim(), slug: slug.trim().toLowerCase() })
      setName('')
      setSlug('')
      await Promise.all([load(), refreshUser()])
    } catch (err) {
      setError(getErrorMessage(err, 'Не вдалося створити провайдера'))
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (p: Provider) => {
    const ok = window.confirm(
      `Видалити провайдера «${p.name}»? Усі його вакансії та доступи буде видалено безповоротно.`,
    )
    if (!ok) return
    setDeletingId(p.id)
    setError(null)
    try {
      await providersApi.remove(p.slug)
      await Promise.all([load(), refreshUser()])
    } catch (err) {
      setError(getErrorMessage(err, 'Не вдалося видалити провайдера'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-semibold text-text mb-4">Новий провайдер</h3>
        <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Назва"
            placeholder="Acme Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Slug (a-z, 0-9, -; 2–40 символів)"
            placeholder="acme"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            pattern="[a-zA-Z0-9\-]{2,40}"
            required
          />
          <div className="sm:col-span-2 flex items-center justify-between gap-4">
            {error ? <p className="text-sm text-red-400">{error}</p> : <span />}
            <Button type="submit" disabled={submitting || !name.trim() || !slug.trim()}>
              {submitting ? 'Створення…' : 'Створити'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-text mb-4">Провайдери</h3>
        {loading ? (
          <p className="text-sm text-muted">Завантаження…</p>
        ) : providers.length === 0 ? (
          <p className="text-sm text-muted">Провайдерів ще немає.</p>
        ) : (
          <ul className="divide-y divide-border">
            {providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <span className="text-sm text-text">{p.name}</span>
                <div className="flex items-center gap-3">
                  <code className="text-xs text-muted">/provider/{p.slug}/vacancies</code>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={deletingId === p.id}
                    onClick={() => void onDelete(p)}
                  >
                    {deletingId === p.id ? 'Видалення…' : 'Видалити'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
