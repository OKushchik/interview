import { useNavigate } from 'react-router-dom'
import type { Provider } from '@/types'
import { Select } from '@/components/ui/Select'
import { providerPath } from '@/utils/paths'

interface ProviderSelectProps {
  providers: Provider[]
  value: string
  /** Section the switch leads to (vacancies by default). */
  section?: 'vacancies' | 'topics'
}

/** Provider select: regular react-router navigation without a page reload. */
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
