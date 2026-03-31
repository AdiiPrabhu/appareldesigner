import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, Search, Star, Edit2, Trash2, Plus, ChevronRight } from 'lucide-react'
import { presetsApi } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import Button from '@/components/common/Button'
import Modal from '@/components/common/Modal'
import EmptyState from '@/components/common/EmptyState'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { cn, outputStyleLabel, productTypeLabel } from '@/lib/utils'
import type { PromptPreset, OutputStyle, ProductType } from '@/types'

interface PresetsPanelProps {
  fullPage?: boolean
}

const PresetsPanel: React.FC<PresetsPanelProps> = ({ fullPage = false }) => {
  const queryClient = useQueryClient()
  const { loadPreset, addNotification } = useAppStore()
  const [search, setSearch] = useState('')
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null)
  const [editingPreset, setEditingPreset] = useState<PromptPreset | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const { data: presets, isLoading } = useQuery({
    queryKey: ['presets'],
    queryFn: presetsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => presetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
      addNotification({ type: 'success', title: 'Preset Deleted' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PromptPreset> }) =>
      presetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presets'] })
      setShowEditModal(false)
      addNotification({ type: 'success', title: 'Preset Updated' })
    },
  })

  const filtered = presets?.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.prompt.toLowerCase().includes(search.toLowerCase()) ||
      p.style_tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  const builtinPresets = filtered?.filter((p) => p.is_builtin) || []
  const customPresets = filtered?.filter((p) => !p.is_builtin) || []

  const handleLoadPreset = (preset: PromptPreset) => {
    loadPreset({
      prompt: preset.prompt,
      negative_prompt: preset.negative_prompt,
      style_tags: preset.style_tags,
      output_style: preset.output_style,
      product_type: preset.product_type,
    })
    addNotification({ type: 'success', title: 'Preset Loaded', message: preset.name })
  }

  const renderPreset = (preset: PromptPreset) => (
    <div
      key={preset.id}
      className={cn(
        'group relative border rounded-lg transition-all cursor-pointer',
        fullPage ? 'p-3' : 'p-2.5',
        hoveredPreset === preset.id
          ? 'border-primary/50 bg-primary/5'
          : 'border-border hover:border-primary/30 bg-surface2'
      )}
      onMouseEnter={() => setHoveredPreset(preset.id)}
      onMouseLeave={() => setHoveredPreset(null)}
      onClick={() => handleLoadPreset(preset)}
    >
      <div className="flex items-start gap-2">
        {preset.is_builtin ? (
          <Star size={12} className="text-warning flex-shrink-0 mt-0.5" />
        ) : (
          <Bookmark size={12} className="text-primary flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text truncate">{preset.name}</p>
          <p className="text-[10px] text-text/50 mt-0.5 line-clamp-2">{preset.prompt}</p>
          {preset.style_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {preset.style_tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-full text-[9px] bg-surface border border-border text-text/40"
                >
                  {tag}
                </span>
              ))}
              {preset.style_tags.length > 3 && (
                <span className="text-[9px] text-text/30">+{preset.style_tags.length - 3}</span>
              )}
            </div>
          )}
          {(preset.output_style || preset.product_type) && (
            <div className="flex items-center gap-2 mt-1">
              {preset.output_style && (
                <span className="text-[9px] text-primary">{outputStyleLabel(preset.output_style)}</span>
              )}
              {preset.product_type && (
                <span className="text-[9px] text-accent">{productTypeLabel(preset.product_type)}</span>
              )}
            </div>
          )}
        </div>
        {/* Actions */}
        {!preset.is_builtin && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingPreset(preset)
                setShowEditModal(true)
              }}
              className="p-1 rounded hover:bg-surface text-text/30 hover:text-text"
            >
              <Edit2 size={11} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Delete this preset?')) deleteMutation.mutate(preset.id)
              }}
              className="p-1 rounded hover:bg-surface text-text/30 hover:text-error"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const content = (
    <div className={cn('space-y-4', fullPage ? 'p-6' : 'p-3')}>
      {/* Search */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text/30" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search presets..."
          className="w-full bg-surface2 border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-text/30 focus:outline-none focus:border-primary/50"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Built-in presets */}
          {builtinPresets.length > 0 && (
            <div>
              <p className="text-[10px] text-text/40 font-semibold uppercase tracking-wider mb-2">
                Built-in ({builtinPresets.length})
              </p>
              <div className={cn('space-y-2', fullPage && 'grid grid-cols-2 gap-2 space-y-0')}>
                {builtinPresets.map(renderPreset)}
              </div>
            </div>
          )}

          {/* Custom presets */}
          {customPresets.length > 0 && (
            <div>
              <p className="text-[10px] text-text/40 font-semibold uppercase tracking-wider mb-2">
                Custom ({customPresets.length})
              </p>
              <div className={cn('space-y-2', fullPage && 'grid grid-cols-2 gap-2 space-y-0')}>
                {customPresets.map(renderPreset)}
              </div>
            </div>
          )}

          {filtered?.length === 0 && (
            <EmptyState
              icon={<Bookmark />}
              title="No presets found"
              description={search ? `No results for "${search}"` : 'No presets available'}
              compact
            />
          )}
        </>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="h-full overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-text">Prompt Presets</h2>
              <p className="text-sm text-text/40 mt-1">
                Pre-built and custom prompts for common design styles
              </p>
            </div>
          </div>
          {content}
        </div>
      </div>
    )
  }

  return content
}

export default PresetsPanel
