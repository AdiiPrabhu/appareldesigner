import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  color?: string
}

const sizeMap = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className, color }) => {
  return (
    <div
      className={cn(
        'rounded-full border-transparent animate-spin flex-shrink-0',
        sizeMap[size],
        className
      )}
      style={{
        borderTopColor: color || 'var(--color-primary)',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: color ? `${color}40` : 'rgba(108,99,255,0.25)',
      }}
    />
  )
}

export default LoadingSpinner
