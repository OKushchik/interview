import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Vacancy, VacancyFormData, InterviewConfig, LoadStatus, VacancyJsonAction } from '@/types'
import { VACANCY_JSON_EXAMPLE } from '@/types'
import { isManualVacancy } from '@/utils/manualVacancy'
import { alignConfig, buildQuestionsJson, downloadJson, parseQuestionsJson } from '@/utils/vacancyJson'
import { MOCK_VACANCIES } from '@/data/mockVacancies'
import { useAuthStore } from '@/store/authStore'
import { useInterviewStore } from '@/store/interviewStore'
import { generateQuestions } from '@/services/aiService'
import { vacanciesApi } from '@/services/vacanciesApi'
import { ApiError } from '@/services/api'
import { providerPath, vacanciesPath } from '@/utils/paths'
import { Header } from '@/components/layout/Header'
import { VacancyCard } from '@/components/vacancies/VacancyCard'
import { ProviderSelect } from '@/components/vacancies/ProviderSelect'
import { NoProviderAccess } from '@/components/vacancies/NoProviderAccess'
import { CreateVacancyModal } from '@/components/modals/CreateVacancyModal'
import { ManualVacancyModal } from '@/components/modals/ManualVacancyModal'
import { InterviewConfigModal } from '@/components/modals/InterviewConfigModal'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

/**
 * Список вакансій. З `:slug` (/provider/<slug>/vacancies) вакансії приходять з API,
 * без `:slug` (/vacancies) показуються мок-вакансії для користувача без провайдера.
 */
export function VacanciesPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const user = useAuthStore((s) => s.user)
  const providers = user?.accessibleProviders ?? []
  // Створювати, редагувати й видаляти вакансії можуть лише адміни; звичайний користувач бачить лише «Пройти співбесіду».
  const canManageVacancies =
    Boolean(slug) && (user?.role === 'super_admin' || user?.role === 'provider_admin')
  const canCreateVacancy = canManageVacancies
  const { startSession, setSession, setGenerating, isGenerating } = useInterviewStore()

  const [apiVacancies, setApiVacancies] = useState<Vacancy[]>([])
  const [status, setStatus] = useState<LoadStatus>(slug ? 'loading' : 'ready')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showManualModal, setShowManualModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deletingVacancy, setDeletingVacancy] = useState<Vacancy | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [importingVacancy, setImportingVacancy] = useState<Vacancy | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Стабільний об'єкт: модалка скидає форму при зміні initial, тож новий об'єкт на кожен рендер стирав би введене.
  const editingManual = editingVacancy !== null && isManualVacancy(editingVacancy)
  const editInitial = useMemo(
    () => (editingVacancy ? { title: editingVacancy.title, level: editingVacancy.level, skills: editingVacancy.skills, interviewConfig: editingVacancy.interviewConfig ?? null } : null),
    [editingVacancy],
  )

  useEffect(() => {
    if (!slug) {
      setStatus('ready')
      return
    }
    let cancelled = false
    setStatus('loading')
    setLoadError(null)
    setApiVacancies([])
    vacanciesApi
      .list(slug)
      .then((list) => {
        if (cancelled) return
        setApiVacancies(list)
        setStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
          setStatus('forbidden')
          return
        }
        setLoadError(error instanceof ApiError ? error.message : 'Не вдалося завантажити вакансії')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const vacancies = slug ? apiVacancies : MOCK_VACANCIES
  const firstProvider = providers[0]
  const fallbackPath = firstProvider ? providerPath(firstProvider.slug, 'vacancies') : vacanciesPath

  const handleStartInterview = (vacancy: Vacancy) => {
    setSelectedVacancy(vacancy)
    setGenerateError(null)
    // Конфігурацію завжди обирає користувач: вікно відкривається щоразу.
    setShowConfigModal(true)
  }

  const handleCreateNext = async (form: VacancyFormData) => {
    if (!slug) return
    setCreating(true)
    setCreateError(null)
    try {
      const vacancy = await vacanciesApi.create(slug, form)
      setApiVacancies((prev) => [vacancy, ...prev])
      setShowCreateModal(false)
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : 'Не вдалося створити вакансію')
    } finally {
      setCreating(false)
    }
  }

  const handleManualCreate = async (form: VacancyFormData) => {
    if (!slug) return
    setCreating(true)
    setCreateError(null)
    try {
      const vacancy = await vacanciesApi.create(slug, form)
      setApiVacancies((prev) => [vacancy, ...prev])
      setShowManualModal(false)
    } catch (error) {
      setCreateError(error instanceof ApiError ? error.message : 'Не вдалося створити вакансію')
    } finally {
      setCreating(false)
    }
  }

  const handleEditSave = async (form: VacancyFormData) => {
    if (!slug || !editingVacancy) return
    setBusy(true)
    setEditError(null)
    try {
      const updated = await vacanciesApi.update(slug, editingVacancy.id, form)
      setApiVacancies((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
      setEditingVacancy(null)
    } catch (error) {
      setEditError(error instanceof ApiError ? error.message : 'Не вдалося зберегти вакансію')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!slug || !deletingVacancy) return
    setBusy(true)
    setDeleteError(null)
    try {
      await vacanciesApi.remove(slug, deletingVacancy.id)
      setApiVacancies((prev) => prev.filter((v) => v.id !== deletingVacancy.id))
      setDeletingVacancy(null)
    } catch (error) {
      setDeleteError(error instanceof ApiError ? error.message : 'Не вдалося видалити вакансію')
    } finally {
      setBusy(false)
    }
  }

  const handleJsonAction = (vacancy: Vacancy, action: VacancyJsonAction) => {
    if (action === 'export') {
      downloadJson(buildQuestionsJson(vacancy), `${vacancy.title.replace(/[^\w-]+/g, '_')}-questions.json`)
      return
    }
    setImportError(null)
    setImportingVacancy(vacancy)
  }

  const handleImportFile = async (file: File) => {
    if (!slug || !importingVacancy) return
    setBusy(true)
    setImportError(null)
    try {
      const questions = parseQuestionsJson(await file.text())
      const config = alignConfig(importingVacancy.interviewConfig, questions)
      const updated = await vacanciesApi.importQuestions(slug, importingVacancy.id, questions, config)
      setApiVacancies((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
      setImportingVacancy(null)
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Не вдалося імпортувати файл')
    } finally {
      setBusy(false)
    }
  }

  const handleConfigStart =async (config: InterviewConfig, vacancyOverride?: Vacancy) => {
    const vacancy = vacancyOverride ?? selectedVacancy
    if (!vacancy) return

    setGenerating(true)
    setGenerateError(null)
    startSession(vacancy, config)

    try {
      const questions = await generateQuestions(vacancy, config)
      setSession({
        vacancy,
        config,
        quizQuestions: questions.quizQuestions,
        botQuestions: questions.botQuestions,
        codingTasks: questions.codingTasks,
        quizAnswers: [],
        botAnswers: [],
        codingAnswers: [],
      })
      setShowConfigModal(false)
      navigate(slug ? providerPath(slug, 'interview') : '/interview')
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'Не вдалося згенерувати питання'
      setGenerateError(message)
      // Без модалки (збережена конфігурація) помилку інакше ніде показати.
      if (!showConfigModal) setShowConfigModal(true)
    } finally {
      setGenerating(false)
    }
  }

  const renderContent = () => {
    if (status === 'loading') {
      return <p className="text-center text-muted mb-12">Завантаження вакансій…</p>
    }
    if (status === 'forbidden') {
      return <NoProviderAccess backTo={fallbackPath} />
    }
    if (status === 'error') {
      return <p className="text-center text-red-400 mb-12">{loadError}</p>
    }
    if (vacancies.length === 0) {
      return <p className="text-center text-muted mb-12">Вакансій поки немає.</p>
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {vacancies.map((vacancy) => (
          <VacancyCard
            key={vacancy.id}
            vacancy={vacancy}
            onStart={handleStartInterview}
            // Для збереженої конфігурації модалки немає, тож стан очікування показується на картці.
            isLoading={isGenerating && !showConfigModal && selectedVacancy?.id === vacancy.id}
            startDisabled={isGenerating}
            onEdit={canManageVacancies ? (v) => { setEditError(null); setEditingVacancy(v) } : undefined}
            onJson={canManageVacancies ? handleJsonAction : undefined}
            onDelete={canManageVacancies ? (v) => { setDeleteError(null); setDeletingVacancy(v) } : undefined}
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
          <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-4">
            Оберіть вакансію для співбесіди
          </h2>
          <p className="text-muted max-w-2xl mx-auto">
            Пройдіть автоматизовану технічну співбесіду у форматі Quiz або Online Bot
            з AI-аналізом ваших відповідей
          </p>
        </div>

        {slug && providers.length > 0 && <ProviderSelect providers={providers} value={slug} />}

        {renderContent()}

        {canCreateVacancy && status === 'ready' && (
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" onClick={() => { setCreateError(null); setShowCreateModal(true) }}>
              <Plus size={20} />
              Створити власну вакансію з AI
            </Button>
            <Button size="lg" variant="secondary" onClick={() => { setCreateError(null); setShowManualModal(true) }}>
              <Plus size={20} />
              Створити власну вакансію
            </Button>
          </div>
        )}
      </main>

      {canCreateVacancy && (
        <CreateVacancyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onNext={handleCreateNext}
          isSubmitting={creating}
          error={createError}
        />
      )}

      {canCreateVacancy && (
        <ManualVacancyModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          onSubmit={handleManualCreate}
          isSubmitting={creating}
          error={createError}
        />
      )}

      {canManageVacancies && (
        <>
          <CreateVacancyModal
            isOpen={editingVacancy !== null && !editingManual}
            onClose={() => setEditingVacancy(null)}
            onNext={handleEditSave}
            isSubmitting={busy}
            error={editError}
            initial={editInitial}
            heading="Редагувати вакансію"
            submitLabel="Зберегти"
          />

          <ManualVacancyModal
            isOpen={editingManual}
            onClose={() => setEditingVacancy(null)}
            onSubmit={handleEditSave}
            isSubmitting={busy}
            error={editError}
            initial={editingVacancy}
            heading="Редагувати вакансію"
            submitLabel="Зберегти"
          />

          <Modal
            isOpen={importingVacancy !== null}
            onClose={() => !busy && setImportingVacancy(null)}
            title="Імпорт питань з JSON"
            size="xl"
          >
            <p className="text-sm text-muted mb-3">
              Файл має бути у форматі JSON, як і експортований з вакансії. Кожен масив необов&apos;язковий,
              але потрібен хоча б один елемент. Імпорт замінює наявні питання вакансії{' '}
              <span className="text-text font-medium">{importingVacancy?.title}</span>.
            </p>
            <pre className="text-xs bg-background/50 border border-border rounded-xl p-3 mb-4 overflow-x-auto">{VACANCY_JSON_EXAMPLE}</pre>
            <p className="text-xs text-muted mb-4">
              У quizQuestions рівно 4 варіанти, correctIndex — від 0 до 3.
            </p>
            {importError && <p className="text-sm text-red-400 mb-4">{importError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void handleImportFile(file)
              }}
            />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setImportingVacancy(null)} disabled={busy}>
                Скасувати
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={busy}>
                {busy ? 'Імпорт…' : 'Обрати файл'}
              </Button>
            </div>
          </Modal>

          <Modal
            isOpen={deletingVacancy !== null}
            onClose={() => !busy && setDeletingVacancy(null)}
            title="Видалити вакансію?"
            size="md"
          >
            <p className="text-sm text-muted mb-4">
              Вакансію <span className="text-text font-medium">{deletingVacancy?.title}</span> буде видалено
              без можливості відновлення.
            </p>
            {deleteError && <p className="text-sm text-red-400 mb-4">{deleteError}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeletingVacancy(null)} disabled={busy}>
                Скасувати
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm} disabled={busy}>
                {busy ? 'Видалення…' : 'Видалити'}
              </Button>
            </div>
          </Modal>
        </>
      )}

      <InterviewConfigModal
        isOpen={showConfigModal}
        onClose={() => {
          setShowConfigModal(false)
          setSelectedVacancy(null)
        }}
        onStart={handleConfigStart}
        isGenerating={isGenerating}
        vacancy={selectedVacancy}
        error={generateError}
      />
    </div>
  )
}
