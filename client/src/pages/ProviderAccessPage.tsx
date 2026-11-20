import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AccessEntry } from '@/types'
import { accessApi } from '@/services/accessApi'
import { ApiError } from '@/services/api'
import { getErrorMessage } from '@/utils/errors'
import { providerPath } from '@/utils/paths'
import { Header } from '@/components/layout/Header'
import { AccessList } from '@/components/admin/AccessList'
import { NoProviderAccess } from '@/components/vacancies/NoProviderAccess'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

/** /provider/:slug/access: provider_admin grants and revokes accesses to their own provider only. */
export function ProviderAccessPage() {
  const { slug = '' } = useParams()
  const [entries, setEntries] = useState<AccessEntry[]>([])
  const [forbidden, setForbidden] = useState(false)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setEntries(await accessApi.list(slug))
      setForbidden(false)
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 404)) {
        setForbidden(true)
      } else {
        setError(getErrorMessage(e, 'Не вдалося завантажити доступи'))
      }
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    setLoading(true)
    setError(null)
    setMessage(null)
    void load()
  }, [load])

  const onGrant = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      await accessApi.grant(slug, { email: email.trim() })
      setMessage(`Доступ для ${email.trim()} видано`)
      setEmail('')
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Не вдалося видати доступ'))
    } finally {
      setSubmitting(false)
    }
  }

  const onRevoke = async (entry: AccessEntry) => {
    setRevokingId(entry.userId)
    setError(null)
    setMessage(null)
    try {
      await accessApi.revoke(slug, entry.userId)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Не вдалося відкликати доступ'))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-3xl font-bold gradient-text">Доступи</h2>
          <Link to={providerPath(slug, 'vacancies')} className="text-sm text-primary hover:underline">
            До вакансій
          </Link>
        </div>

        {forbidden ? (
          <NoProviderAccess backTo="/" />
        ) : (
          <>
            <Card>
              <h3 className="text-lg font-semibold text-text mb-4">Видати доступ на перегляд</h3>
              <form onSubmit={onGrant} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1">
                  <Input
                    label="Email користувача або адміна іншого провайдера"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={submitting || !email.trim()}>
                  {submitting ? 'Видача…' : 'Видати доступ'}
                </Button>
              </form>
              {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
              {message && <p className="text-sm text-emerald mt-3">{message}</p>}
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-text mb-4">Користувачі з доступом</h3>
              {loading ? (
                <p className="text-sm text-muted">Завантаження…</p>
              ) : (
                <AccessList entries={entries} onRevoke={onRevoke} busyUserId={revokingId} />
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
