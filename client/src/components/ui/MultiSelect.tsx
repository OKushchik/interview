import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

interface MultiSelectProps {
  options: { value: string; label: string }[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  'aria-label'?: string
}

/** Випадаючий список з чекбоксами для вибору кількох значень. */
export function MultiSelect({ options, value, onChange, placeholder = 'Оберіть', disabled, 'aria-label': ariaLabel }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const selected = options.filter((o) => value.includes(o.value)).map((o) => o.label)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-background/50 border border-border text-left text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors disabled:opacity-50"
      >
        <span className={`truncate ${selected.length ? '' : 'text-muted'}`}>{selected.length ? selected.join(', ') : placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" aria-multiselectable="true" className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-border bg-surface p-1 shadow-lg">
          {options.map((o) => {
            const checked = value.includes(o.value)
            return (
              <li key={o.value} role="option" aria-selected={checked}>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text cursor-pointer hover:bg-hover-strong">
                  <input type="checkbox" className="accent-primary" checked={checked} onChange={() => toggle(o.value)} />
                  <span className="flex-1 truncate">{o.label}</span>
                  {checked && <Check size={14} className="text-primary" />}
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
