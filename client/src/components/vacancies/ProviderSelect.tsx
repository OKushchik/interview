import { useNavigate } from 'react-router-dom'
import type { Provider } from '@/types'
import { Select } from '@/components/ui/Select'
import { providerPath } from '@/utils/paths'

interface ProviderSelectProps {
  providers: Provider[]
  value: string
  /** Розділ, до якого веде перемикання (за замовчуванням вакансії). */
  section?: 'vacancies' | 'topics'
}

/** Вибір провайдера: звичайна навігація react-router без перезавантаження сторінки. */
export function ProviderSelect({ providers, value, section = 'vacancies' }: ProviderSelectProps) {
  const navigate = useNavigate()
  const known = providers.some((p) => p.slug === value)
  const options = [
    ...(known ? [] : [{ value, label: value }]),
    ...providers.map((p) => ({ value: p.slug, label: p.name })),
  ]

  return (
    <div className="max-w-xs mx-auto mb-8">
      <Select
        label="Провайдер"
        value={value}
        options={options}
        onChange={(e) => navigate(providerPath(e.target.value, section))}
      />
    </div>
  )
}
