import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Download, GitBranch, Shirt, Trash2, Eye, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { imagesApi, exportApi, getThumbnailUrl } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import { cn, productTypeLabel, formatRelativeDate } from '@/lib/utils'
import type { GeneratedImage } from '@/types'

interface ImageCardProps {
  image: GeneratedImage
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  compact?: boolean
}

const ImageCard: React.FC<ImageCardProps> = ({ image, selected, onSelect, onOpen, compact = false }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setMockupImageId, addNotification } = useAppStore()
  const [isHovered, setIsHovered] = useState(false)
  const [localFavorite, setLocalFavorite] = useState(image.is_favorite)

  const favoriteMutation = useMutation({
    mutationFn: () => imagesApi.toggleFavorite(image.id),
    onSuccess: (data) => {
      setLocalFavorite(data.is_favorite)
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => imagesApi.delete(image.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      queryClient.invalidateQueries({ queryKey: ['gallery-recent'] })
      addNotification({ type: 'success', title: 'Image deleted' })
    },
  })

  const exportMutation = useMutation({
    mutationFn: () => exportApi.exportImage(image.id, { format: 'png' }),
    onSuccess: (data) => {
      addNotification({ type: 'success', title: 'Exported', message: data.export_path })
    },
  })

  const handleSendToMockup = () => {
    setMockupImageId(image.id)
    navigate(`/mockup/${image.id}`)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this design?')) {
      deleteMutation.mutate()
    }
  }

  return (
    <div
      className={cn(
        'group relative bg-surface2 rounded-xl overflow-hidden border transition-all duration-200',
        selected ? 'border-primary ring-1 ring-primary/50' : 'border-border hover:border-primary/30',
        'cursor-pointer'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className={cn('relative overflow-hidden bg-surface', compact ? 'aspect-square' : 'aspect-square')} onClick={onOpen}>
        {image.thumbnail_path ? (
          <img
            src={getThumbnailUrl(image.thumbnail_path)}
            alt={image.prompt}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Shirt size={32} className="text-text/10" />
          </div>
        )}

        {/* Product type badge */}
        <div className="absolute top-1.5 left-1.5">
          <span className="bg-black/60 backdrop-blur-sm text-[10px] text-white px-1.5 py-0.5 rounded font-medium">
            {productTypeLabel(image.product_type)}
          </span>
        </div>

        {/* Hover overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-black/50 flex flex-col justify-end p-2 transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
        >
          {!compact && (
            <p className="text-[10px] text-white/80 line-clamp-2 mb-2">{image.prompt}</p>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onOpen() }}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="View details"
            >
              <Eye size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); exportMutation.mutate() }}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Export"
            >
              <Download size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleSendToMockup() }}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Send to Mockup"
            >
              <Shirt size={12} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 rounded bg-white/10 hover:bg-red-500/50 text-white transition-colors ml-auto"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Select checkbox */}
        <div
          className={cn(
            'absolute top-1.5 right-1.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
            selected
              ? 'bg-primary border-primary'
              : 'bg-black/30 border-white/40 opacity-0 group-hover:opacity-100'
          )}
          onClick={(e) => { e.stopPropagation(); onSelect() }}
        >
          {selected && <Check size={11} className="text-white" />}
        </div>
      </div>

      {/* Footer */}
      {!compact && (
        <div className="p-2 flex items-center justify-between">
          <span className="text-[10px] text-text/30">{formatRelativeDate(image.created_at)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); favoriteMutation.mutate() }}
            className={cn(
              'transition-colors p-0.5',
              localFavorite ? 'text-warning' : 'text-text/20 hover:text-warning'
            )}
          >
            <Star size={13} fill={localFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      )}
    </div>
  )
}

export default ImageCard
