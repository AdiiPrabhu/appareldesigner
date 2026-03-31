import React from 'react'
import { cn } from '@/lib/utils'
import LoadingSpinner from './LoadingSpinner'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent'
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary hover:bg-primary-hover active:bg-primary-active text-white shadow-sm hover:shadow-glow disabled:opacity-50',
  secondary:
    'bg-secondary hover:bg-secondary-hover text-white shadow-sm disabled:opacity-50',
  ghost:
    'bg-transparent hover:bg-surface2 text-text/70 hover:text-text disabled:opacity-40',
  danger:
    'bg-error/10 hover:bg-error/20 text-error border border-error/30 hover:border-error/50 disabled:opacity-50',
  outline:
    'bg-transparent border border-border hover:border-primary/50 text-text/70 hover:text-text disabled:opacity-40',
  accent:
    'bg-accent hover:bg-accent-hover text-background font-semibold shadow-sm hover:shadow-glow-accent disabled:opacity-50',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-xs rounded gap-1',
  sm: 'h-7 px-2.5 text-xs rounded gap-1.5',
  md: 'h-9 px-4 text-sm rounded gap-2',
  lg: 'h-11 px-6 text-base rounded-lg gap-2',
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 cursor-pointer select-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {iconRight && !loading && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  )
}

export default Button
