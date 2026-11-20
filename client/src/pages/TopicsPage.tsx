import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Topic, TopicFormData } from '@/types'
import { useAuthStore } from '@/store/authStore'
import { canManageProvider } from '@/utils/providerAccess'
import { topicsApi } from '@/services/topicsApi'
import { ApiError } from '@/services/api'
import { providerPath, topicPath } from '@/utils/paths'
import { ProviderSelect } from '@/components/vacancies/ProviderSelect'
import { NoProviderAccess } from '@/components/vacancies/NoProviderAccess'
import { Header } from '@/components/layout/Header'
import { TopicCard } from '@/components/topics/TopicCard'
import { CreateTopicModal } from '@/components/modals/CreateTopicModal'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

/** Аналіз статей: список тем. Створювати й видаляти можуть лише адміни. */
export function TopicsPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const providers = useAuthStore((s) => s.user?.accessibleProviders) ?? []
  const user = useAuthStore((s) => s.user)
  const canManage = canManageProvider(user, slug)

  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(Boolean(slug))
  const [forbidden, setForbidden] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Topic | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setForbidden(false)
    setLoadError(null)
    setTopics([])
    topicsApi
      .list(slug)
      .then((list) => {
        if (!cancelled) setTopics(list)
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
          setForbidden(true)
          return
        }
        setLoadError(error instanceof ApiError ? error.message : 'Не вдалося завантажити теми')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const handleCreate = async (form: TopicFormData) => {
    setCreating(true)
    setCreateError(null)
    try {
      if (!slug) return
      const topic = await topicsApi.create(slug, form)
      setTopics((prev) => [topic, ...prev])
      setShowCreate(false)
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : 'Не вдалося створити тему')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!slug || !deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await topicsApi.remove(slug, deleting.id)
      setTopics((prev) => prev.filter((t) => t.id !== deleting.id))
      setDeleting(null)
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : 'Не вдалося видалити тему')
    } finally {
      setDeleteBusy(false)
    }
  }

  const renderContent = () => {
    if (!slug) return <NoProviderAccess backTo="/vacancies" />
    if (forbidden) return <NoProviderAccess backTo={providers[0] ? providerPath(providers[0].slug, 'topics') : '/vacancies'} />
    if (loading) return <p className="text-center text-muted mb-12">Завантаження тем…</p>
    if (loadError) return <p className="text-center text-red-400 mb-12">{loadError}</p>
    if (topics.length === 0) return <p className="text-center text-muted mb-12">Тем поки немає.</p>
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            onOpen={(t) => navigate(topicPath(slug, t.id))}
            onDelete={canManage ? (t) => { setDeleteError(null); setDeleting(t) } : undefined}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">Аналіз статей</h2>
          <p className="text-muted max-w-2xl mx-auto">
            Читайте матеріали за темами та перевіряйте себе в тесті
          </p>
        </div>

        {slug && providers.length > 0 && <ProviderSelect providers={providers} value={slug} section="topics" />}

        {renderContent()}

        {canManage && !loading && (
          <div className="flex justify-center">
            <Button size="lg" onClick={() => { setCreateError(null); setShowCreate(true) }}>
              <Plus size={20} />
              Додати тему
            </Button>
          </div>
        )}
      </main>

      {canManage && (
        <>
          <CreateTopicModal
            isOpen={showCreate}
            onClose={() => setShowCreate(false)}
            onSubmit={handleCreate}
            isSubmitting={creating}
            error={createError}
          />

          <Modal isOpen={deleting !== null} onClose={() => !deleteBusy && setDeleting(null)} title="Видалити тему?" size="md">
            <p className="text-sm text-muted mb-4">
              Тему <span className="text-text font-medium">{deleting?.title}</span> буде видалено без можливості відновлення.
            </p>
            {deleteError && <p className="text-sm text-red-400 mb-4">{deleteError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleting(null)} disabled={deleteBusy}>
                Скасувати
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleteBusy}>
                {deleteBusy ? 'Видалення…' : 'Видалити'}
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}
