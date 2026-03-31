import React from 'react'
import { cn } from '@/lib/utils'
import Button from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
  }
  className?: string
  compact?: boolean
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'text-text/20 mb-4',
            compact ? 'w-10 h-10' : 'w-16 h-16',
            '[&>svg]:w-full [&>svg]:h-full'
          )}
        >
          {icon}
        </div>
      )}
      <h3 className={cn('font-semibold text-text/60', compact ? 'text-sm' : 'text-base')}>{title}</h3>
      {description && (
        <p className={cn('text-text/40 mt-1.5 max-w-sm', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {action && (
        <div className="mt-5">
          <Button variant="primary" onClick={action.onClick} icon={action.icon} size={compact ? 'sm' : 'md'}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}

export default EmptyState
