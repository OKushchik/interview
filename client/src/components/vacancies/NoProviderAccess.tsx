import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface NoProviderAccessProps {
  /** Куди повернутися: перший доступний провайдер або мок-список. */
  backTo: string
}

export function NoProviderAccess({ backTo }: NoProviderAccessProps) {
  return (
    <Card className="max-w-xl mx-auto text-center flex flex-col items-center gap-3">
      <Lock size={32} className="text-muted" />
      <h3 className="text-lg font-semibold text-text">Немає доступу</h3>
      <p className="text-sm text-muted">
        У вас немає доступу до цього провайдера або він не існує. Зверніться до адміністратора.
      </p>
      <Link to={backTo} className="text-sm text-primary hover:underline">
        Повернутися до вакансій
      </Link>
    </Card>
  )
}
