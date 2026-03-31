import React from 'react'
import * as RadixSlider from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  displayValue?: string | number
  className?: string
  disabled?: boolean
  showTicks?: boolean
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  displayValue,
  className,
  disabled,
}) => {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <label className="text-xs text-text/60 font-medium">{label}</label>
        <span className="text-xs text-primary font-mono font-semibold min-w-[40px] text-right">
          {displayValue !== undefined ? displayValue : value}
        </span>
      </div>
      <RadixSlider.Root
        className={cn(
          'relative flex items-center select-none touch-none w-full h-5',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(vals) => onChange(vals[0])}
      >
        <RadixSlider.Track className="bg-border relative grow rounded-full h-1.5">
          <RadixSlider.Range className="absolute bg-primary rounded-full h-full" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className={cn(
            'block w-4 h-4 bg-white border-2 border-primary rounded-full shadow-sm',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
            'hover:scale-110 transition-transform',
            !disabled && 'cursor-grab active:cursor-grabbing'
          )}
          aria-label={label}
        />
      </RadixSlider.Root>
    </div>
  )
}

export default Slider
