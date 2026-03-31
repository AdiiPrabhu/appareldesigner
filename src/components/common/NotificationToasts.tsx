import React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-error/30 bg-error/10 text-error',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  info: 'border-primary/30 bg-primary/10 text-primary',
}

const NotificationToasts: React.FC = () => {
  const { notifications, removeNotification } = useAppStore()

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.slice(-5).map((n) => {
        const Icon = icons[n.type]
        return (
          <div
            key={n.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border shadow-xl pointer-events-auto toast-enter',
              'bg-surface',
              colors[n.type]
            )}
          >
            <Icon size={16} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text">{n.title}</p>
              {n.message && <p className="text-xs text-text/60 mt-0.5">{n.message}</p>}
            </div>
            <button
              onClick={() => removeNotification(n.id)}
              className="text-text/30 hover:text-text/60 flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default NotificationToasts
