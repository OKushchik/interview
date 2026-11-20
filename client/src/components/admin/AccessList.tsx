import { Trash2 } from 'lucide-react'
import type { AccessEntry } from '@/types'
import { Button } from '@/components/ui/Button'

interface AccessListProps {
  entries: AccessEntry[]
  onRevoke: (entry: AccessEntry) => void
  busyUserId?: string | null
}

/** List of users with access to a provider, with the ability to revoke access. */
export function AccessList({ entries, onRevoke, busyUserId }: AccessListProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted">Жодного користувача з доступом поки немає.</p>
  }

  return (
    <ul className="divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.userId} className="flex items-center justify-between gap-3 py-3">
          <span className="text-sm text-text truncate">{entry.email}</span>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onRevoke(entry)}
            disabled={busyUserId === entry.userId}
            aria-label={`Відкликати доступ ${entry.email}`}
          >
            <Trash2 size={14} />
            Відкликати
          </Button>
        </li>
      ))}
    </ul>
  )
}
