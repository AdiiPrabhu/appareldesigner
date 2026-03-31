import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import { imagesApi, getThumbnailUrl } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import PromptInput from './PromptInput'
import ProductSelector from './ProductSelector'
import StyleTags from './StyleTags'
import AdvancedControls from './AdvancedControls'
import GenerationActions from './GenerationActions'
import ReferencesPanel from '@/components/References/ReferencesPanel'
import PresetsPanel from '@/components/Presets/PresetsPanel'
import ImageDetail from '@/components/Gallery/ImageDetail'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { cn, productTypeLabel, formatRelativeDate } from '@/lib/utils'
import type { GeneratedImage } from '@/types'

const DesignWorkspace: React.FC = () => {
  const { projectId } = useParams()
  const queryClient = useQueryClient()
  const { generationSettings, setGenerationSettings, referencePanelOpen, setReferencePanelOpen } = useAppStore()
  const [generatedImageIds, setGeneratedImageIds] = useState<string[]>([])
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [rightTab, setRightTab] = useState<'results' | 'presets'>('results')

  const { data: generatedImages, isLoading } = useQuery({
    queryKey: ['workspace-images', projectId, generatedImageIds],
    queryFn: () =>
      imagesApi.list({
        project_id: projectId,
        sort: 'newest',
        page: 1,
        page_size: 20,
      }),
    enabled: true,
    refetchInterval: generatedImageIds.length > 0 ? 3000 : false,
  })

  const handleGenerationComplete = (ids: string[]) => {
    setGeneratedImageIds((prev) => [...new Set([...ids, ...prev])])
    queryClient.invalidateQueries({ queryKey: ['workspace-images'] })
    queryClient.invalidateQueries({ queryKey: ['gallery-recent'] })
  }

  const isGenerating = useAppStore((s) =>
    s.activeJob?.status === 'running' || s.activeJob?.status === 'pending'
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: References + Presets */}
      <div
        className={cn(
          'border-r border-border bg-surface flex flex-col transition-all duration-200 flex-shrink-0',
          referencePanelOpen ? 'w-[240px]' : 'w-0 overflow-hidden'
        )}
      >
        <div className="flex border-b border-border flex-shrink-0">
          <button
            className={cn(
              'flex-1 py-2.5 text-xs font-medium transition-colors',
              rightTab === 'results' ? 'text-primary border-b-2 border-primary' : 'text-text/50 hover:text-text'
            )}
            onClick={() => setRightTab('results')}
          >
            References
          </button>
          <button
            className={cn(
              'flex-1 py-2.5 text-xs font-medium transition-colors',
              rightTab === 'presets' ? 'text-primary border-b-2 border-primary' : 'text-text/50 hover:text-text'
            )}
            onClick={() => setRightTab('presets')}
          >
            Presets
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rightTab === 'results' ? <ReferencesPanel /> : <PresetsPanel />}
        </div>
      </div>

      {/* Toggle references panel */}
      <button
        onClick={() => setReferencePanelOpen(!referencePanelOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-surface border border-border rounded-r-lg p-1 hover:bg-surface2 transition-colors"
        style={{ left: referencePanelOpen ? 240 : 0, transition: 'left 0.2s' }}
      >
        {referencePanelOpen ? <ChevronLeft size={14} className="text-text/40" /> : <ChevronRight size={14} className="text-text/40" />}
      </button>

      {/* Center: Generation controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-0">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Product</h3>
            <ProductSelector
              value={generationSettings.product_type}
              onChange={(type) => setGenerationSettings({ product_type: type })}
            />
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Prompt</h3>
            <PromptInput onGenerate={() => {}} isGenerating={isGenerating} />
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text mb-3">Style</h3>
            <StyleTags />
          </div>

          <AdvancedControls />

          <div className="bg-surface border border-border rounded-xl p-4">
            <GenerationActions
              projectId={projectId}
              onComplete={handleGenerationComplete}
            />
          </div>
        </div>
      </div>

      {/* Right panel: Results */}
      <div className="w-[280px] border-l border-border bg-surface flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-primary" />
            <span className="text-xs font-semibold text-text">Results</span>
          </div>
          <span className="text-xs text-text/40">{generatedImages?.total || 0} total</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex justify-center pt-8">
              <LoadingSpinner />
            </div>
          ) : !generatedImages?.items.length ? (
            <EmptyState
              icon={<Layers />}
              title="No results yet"
              description="Generate a design to see results here"
              compact
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {generatedImages.items.map((image) => (
                <button
                  key={image.id}
                  onClick={() => {
                    setSelectedImage(image)
                    setShowDetail(true)
                  }}
                  className="group relative aspect-square bg-surface2 rounded-lg overflow-hidden border border-border hover:border-primary/40 transition-all"
                >
                  <img
                    src={getThumbnailUrl(image.thumbnail_path)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end">
                    <div className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white line-clamp-2">{image.prompt}</p>
                    </div>
                  </div>
                  <div className="absolute top-1 right-1">
                    <span className="bg-black/50 text-[9px] text-white px-1 py-0.5 rounded">
                      {productTypeLabel(image.product_type)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image detail modal */}
      {showDetail && selectedImage && (
        <ImageDetail
          image={selectedImage}
          open={showDetail}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  )
}

export default DesignWorkspace
