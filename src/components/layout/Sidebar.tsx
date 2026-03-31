import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  Wand2,
  Images,
  Shirt,
  FolderOpen,
  Bookmark,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Workspace', path: '/workspace', icon: Wand2 },
  { label: 'Gallery', path: '/gallery', icon: Images },
  { label: 'Mockup', path: '/mockup', icon: Shirt },
  { label: 'References', path: '/references', icon: FolderOpen },
  { label: 'Presets', path: '/presets', icon: Bookmark },
  { label: 'Settings', path: '/settings', icon: Settings },
]

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, setSidebarCollapsed, backendConnected, ollamaConnected } = useAppStore()
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-full flex flex-col bg-surface border-r border-border z-50 transition-all duration-200',
        sidebarCollapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 h-14 cursor-pointer flex-shrink-0 border-b border-border"
        onClick={() => navigate('/')}
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Shirt size={18} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-semibold text-text text-sm whitespace-nowrap">Apparel Studio</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-150 group relative',
                isActive
                  ? 'bg-primary/20 text-primary'
                  : 'text-text/60 hover:bg-surface2 hover:text-text'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  size={18}
                  className={cn(
                    'flex-shrink-0',
                    isActive ? 'text-primary' : 'text-text/50 group-hover:text-text'
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                )}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-surface2 border border-border rounded text-xs text-text whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </div>
                )}
                {isActive && !sidebarCollapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status indicators */}
      <div className="px-3 py-3 border-t border-border flex-shrink-0 space-y-2">
        <div className={cn('flex items-center gap-2', sidebarCollapsed && 'justify-center')}>
          <div
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              backendConnected ? 'bg-success' : 'bg-error'
            )}
          />
          {!sidebarCollapsed && (
            <span className="text-xs text-text/50">
              {backendConnected ? 'Backend OK' : 'Backend Offline'}
            </span>
          )}
        </div>
        <div className={cn('flex items-center gap-2', sidebarCollapsed && 'justify-center')}>
          <Zap
            size={8}
            className={cn('flex-shrink-0', ollamaConnected ? 'text-accent' : 'text-error')}
          />
          {!sidebarCollapsed && (
            <span className="text-xs text-text/50">
              {ollamaConnected ? 'Ollama OK' : 'Ollama Offline'}
            </span>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-surface2 transition-colors z-10"
      >
        {sidebarCollapsed ? (
          <ChevronRight size={12} className="text-text/50" />
        ) : (
          <ChevronLeft size={12} className="text-text/50" />
        )}
      </button>
    </div>
  )
}

export default Sidebar
