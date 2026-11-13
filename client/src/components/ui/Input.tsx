import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  trailing?: ReactNode
}

export function Input({ label, error, trailing, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-muted">{label}</label>}
      <div className="relative">
        <input
          className={`w-full px-4 py-2.5 rounded-xl bg-background/50 border border-border text-text placeholder:text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors ${trailing ? 'pr-11' : ''} ${className}`}
          {...props}
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</div>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
