import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  hideClose?: boolean
  className?: string
}

const sizeMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl',
}

const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
  hideClose = false,
  className,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'bg-surface border border-border rounded-xl shadow-2xl',
            'w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col',
            'animate-slide-in',
            sizeMap[size],
            className
          )}
        >
          {(title || !hideClose) && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div>
                {title && (
                  <Dialog.Title className="text-base font-semibold text-text">{title}</Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="text-xs text-text/50 mt-0.5">{description}</Dialog.Description>
                )}
              </div>
              {!hideClose && (
                <Dialog.Close className="p-1 rounded-lg hover:bg-surface2 text-text/40 hover:text-text transition-colors">
                  <X size={16} />
                </Dialog.Close>
              )}
            </div>
          )}
          <div className="flex-1 overflow-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default Modal
