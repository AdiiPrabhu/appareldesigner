import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Plus, Wifi, WifiOff, Zap } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import Button from '@/components/common/Button'
import { cn } from '@/lib/utils'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/workspace': 'Design Workspace',
  '/gallery': 'Gallery',
  '/mockup': 'Mockup Preview',
  '/references': 'Reference Manager',
  '/presets': 'Prompt Presets',
  '/settings': 'Settings',
}

const TopBar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentProject, notifications, backendConnected, ollamaConnected, removeNotification } = useAppStore()
  const [showNotifications, setShowNotifications] = useState(false)

  const getPageTitle = () => {
    const path = '/' + location.pathname.split('/')[1]
    return PAGE_TITLES[path] || 'Apparel Design Studio'
  }

  const unreadCount = notifications.length

  return (
    <div className="h-12 bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0 drag-region">
      {/* Page title */}
      <div className="flex items-center gap-2 no-drag">
        <h1 className="text-sm font-semibold text-text">{getPageTitle()}</h1>
        {currentProject && (
          <>
            <span className="text-text/30">/</span>
            <span className="text-sm text-primary font-medium">{currentProject.name}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Connection status */}
      <div className="flex items-center gap-3 no-drag">
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
            backendConnected
              ? 'bg-success/10 text-success border border-success/20'
              : 'bg-error/10 text-error border border-error/20'
          )}
        >
          {backendConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
          <span>API</span>
        </div>

        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs',
            ollamaConnected
              ? 'bg-accent/10 text-accent border border-accent/20'
              : 'bg-error/10 text-error border border-error/20'
          )}
        >
          <Zap size={11} />
          <span>Ollama</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-1.5 rounded-lg hover:bg-surface2 transition-colors text-text/50 hover:text-text"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-secondary rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-surface border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-text">Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      notifications.forEach((n) => removeNotification(n.id))
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center text-text/40 text-xs">No notifications</div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className="px-3 py-2.5 border-b border-border/50 hover:bg-surface2 transition-colors flex items-start gap-2"
                    >
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
                          n.type === 'success' && 'bg-success',
                          n.type === 'error' && 'bg-error',
                          n.type === 'warning' && 'bg-warning',
                          n.type === 'info' && 'bg-primary'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text">{n.title}</p>
                        {n.message && <p className="text-xs text-text/50 mt-0.5">{n.message}</p>}
                      </div>
                      <button
                        onClick={() => removeNotification(n.id)}
                        className="text-text/30 hover:text-text/60 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* New Design */}
        <Button
          size="sm"
          variant="primary"
          icon={<Plus size={14} />}
          onClick={() => navigate('/workspace')}
          className="no-drag"
        >
          New Design
        </Button>
      </div>
    </div>
  )
}

export default TopBar
