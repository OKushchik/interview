import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'primary' | 'cyan' | 'emerald'
}

const variants = {
  default: 'bg-hover-strong text-muted',
  primary: 'bg-primary/20 text-primary',
  cyan: 'bg-cyan/20 text-cyan',
  emerald: 'bg-emerald/20 text-emerald',
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}
