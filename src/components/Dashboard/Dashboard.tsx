import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Images,
  FolderOpen,
  Star,
  Download,
  Plus,
  Shirt,
  ArrowRight,
  Zap,
  CheckCircle,
  XCircle,
  Wand2,
} from 'lucide-react'
import { projectsApi, imagesApi, presetsApi, healthApi, getThumbnailUrl } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { formatRelativeDate, productTypeLabel } from '@/lib/utils'
import type { ProductType, Project } from '@/types'

const PRODUCT_QUICK_ACTIONS: { type: ProductType; label: string; color: string }[] = [
  { type: 'tshirt', label: 'New T-Shirt Design', color: 'from-primary/20 to-primary/5' },
  { type: 'hoodie', label: 'New Hoodie Design', color: 'from-secondary/20 to-secondary/5' },
  { type: 'jacket', label: 'New Jacket Design', color: 'from-accent/20 to-accent/5' },
]

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const { setCurrentProject, setGenerationSettings, backendConnected, ollamaConnected } = useAppStore()

  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(1, 6),
    enabled: backendConnected,
  })

  const { data: imagesData, isLoading: loadingImages } = useQuery({
    queryKey: ['gallery-recent'],
    queryFn: () => imagesApi.list({ sort: 'newest', page: 1, page_size: 10 }),
    enabled: backendConnected,
  })

  const { data: favoritesData } = useQuery({
    queryKey: ['gallery-favorites-count'],
    queryFn: () => imagesApi.list({ favorites_only: true, page: 1, page_size: 1 }),
    enabled: backendConnected,
  })

  const { data: presets } = useQuery({
    queryKey: ['presets'],
    queryFn: presetsApi.list,
    enabled: backendConnected,
  })

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval: 15_000,
  })

  const handleQuickCreate = (productType: ProductType) => {
    setGenerationSettings({ product_type: productType })
    navigate('/workspace')
  }

  const handleOpenProject = (project: Project) => {
    setCurrentProject(project)
    navigate(`/workspace/${project.id}`)
  }

  const totalImages = imagesData?.total || 0
  const totalProjects = projectsData?.total || 0
  const totalFavorites = favoritesData?.total || 0

  const stats = [
    { label: 'Total Designs', value: totalImages, icon: Images, color: 'text-primary' },
    { label: 'Projects', value: totalProjects, icon: FolderOpen, color: 'text-accent' },
    { label: 'Favorites', value: totalFavorites, icon: Star, color: 'text-warning' },
    { label: 'Exports', value: '—', icon: Download, color: 'text-secondary' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text">Welcome back</h2>
          <p className="text-sm text-text/50 mt-1">What are we designing today?</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => navigate('/workspace')}
          size="md"
        >
          New Design
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs text-text/50">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold text-text">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-text/70 mb-3">Quick Start</h3>
        <div className="grid grid-cols-3 gap-3">
          {PRODUCT_QUICK_ACTIONS.map((action) => (
            <button
              key={action.type}
              onClick={() => handleQuickCreate(action.type)}
              className={`bg-gradient-to-br ${action.color} border border-border rounded-xl p-4 text-left hover:border-primary/30 transition-all group`}
            >
              <Shirt size={24} className="text-text/40 mb-2 group-hover:text-text/60 transition-colors" />
              <p className="text-sm font-medium text-text">{action.label}</p>
              <p className="text-xs text-text/40 mt-1">{productTypeLabel(action.type)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text/70 mb-3">System Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {backendConnected ? (
                <CheckCircle size={14} className="text-success" />
              ) : (
                <XCircle size={14} className="text-error" />
              )}
              <span className="text-sm text-text">Backend API</span>
            </div>
            <span className={`text-xs ${backendConnected ? 'text-success' : 'text-error'}`}>
              {backendConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ollamaConnected ? (
                <Zap size={14} className="text-accent" />
              ) : (
                <XCircle size={14} className="text-error" />
              )}
              <span className="text-sm text-text">Ollama LLM</span>
            </div>
            <span className={`text-xs ${ollamaConnected ? 'text-accent' : 'text-error'}`}>
              {ollamaConnected ? `Connected${health?.ollama_model ? ` • ${health.ollama_model}` : ''}` : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {health?.image_model_loaded ? (
                <CheckCircle size={14} className="text-success" />
              ) : (
                <XCircle size={14} className="text-warning" />
              )}
              <span className="text-sm text-text">Image Model</span>
            </div>
            <span className={`text-xs ${health?.image_model_loaded ? 'text-success' : 'text-warning'}`}>
              {health?.image_model_loaded ? 'Loaded' : 'Not loaded'}
            </span>
          </div>
        </div>
        {!health?.image_model_loaded && (
          <p className="text-xs text-text/40 mt-3 p-2 bg-surface2 rounded-lg">
            Image generation requires a diffusion model. See Settings to configure the model path, or check the README for setup instructions.
          </p>
        )}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text/70">Recent Projects</h3>
          <button
            onClick={() => navigate('/gallery')}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={12} />
          </button>
        </div>
        {loadingProjects ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : projectsData?.items.length === 0 ? (
          <EmptyState
            icon={<FolderOpen />}
            title="No projects yet"
            description="Create your first project to get started"
            action={{ label: 'New Design', onClick: () => navigate('/workspace'), icon: <Plus size={14} /> }}
            compact
          />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {projectsData?.items.map((project) => (
              <button
                key={project.id}
                onClick={() => handleOpenProject(project)}
                className="bg-surface border border-border rounded-xl overflow-hidden text-left hover:border-primary/30 transition-all group"
              >
                <div className="aspect-video bg-surface2 relative overflow-hidden">
                  {project.thumbnail_url ? (
                    <img
                      src={getThumbnailUrl(project.thumbnail_url)}
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shirt size={32} className="text-text/10" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/50 rounded px-1.5 py-0.5">
                    <span className="text-[10px] text-white">{project.image_count} designs</span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-text truncate">{project.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-primary">{productTypeLabel(project.product_type)}</span>
                    <span className="text-xs text-text/30">{formatRelativeDate(project.updated_at)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recent Designs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text/70">Recent Designs</h3>
          <button
            onClick={() => navigate('/gallery')}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Gallery <ArrowRight size={12} />
          </button>
        </div>
        {loadingImages ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : imagesData?.items.length === 0 ? (
          <EmptyState
            icon={<Images />}
            title="No designs yet"
            description="Start generating to see your designs here"
            compact
          />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {imagesData?.items.map((image) => (
              <div
                key={image.id}
                className="flex-shrink-0 w-24 rounded-lg overflow-hidden border border-border cursor-pointer hover:border-primary/30 transition-all group"
                onClick={() => navigate('/gallery')}
              >
                <div className="aspect-square bg-surface2">
                  {image.thumbnail_path && (
                    <img
                      src={getThumbnailUrl(image.thumbnail_path)}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Presets preview */}
      {presets && presets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text/70">Prompt Presets</h3>
            <button
              onClick={() => navigate('/presets')}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              All presets <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {presets.slice(0, 3).map((preset) => (
              <button
                key={preset.id}
                className="bg-surface border border-border rounded-lg p-3 text-left hover:border-primary/30 transition-all group"
                onClick={() => navigate('/workspace')}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Wand2 size={12} className="text-primary" />
                  <span className="text-xs font-medium text-text">{preset.name}</span>
                </div>
                <p className="text-xs text-text/40 line-clamp-2">{preset.prompt}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
