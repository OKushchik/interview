import type { InputHTMLAttributes } from 'react'

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  value: number
  min: number
  max: number
}

export function Slider({ label, value, min, max, className = '', ...props }: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="font-medium text-muted">{label}</span>
          <span className="text-cyan font-semibold">{value}</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        className={`w-full h-2 rounded-full appearance-none cursor-pointer ${className}`}
        style={{
          background: `linear-gradient(to right, var(--color-primary) ${percentage}%, var(--color-surface) ${percentage}%)`,
        }}
        {...props}
      />
      <div className="flex justify-between text-xs text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
