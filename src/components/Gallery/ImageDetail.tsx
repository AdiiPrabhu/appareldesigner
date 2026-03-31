import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Star, Download, GitBranch, Shirt, Copy, CheckCircle, X, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { imagesApi, exportApi, getImageUrl } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { cn, productTypeLabel, outputStyleLabel, formatDate } from '@/lib/utils'
import type { GeneratedImage, ExportRequest } from '@/types'

interface ImageDetailProps {
  image: GeneratedImage
  open: boolean
  onClose: () => void
}

const EXPORT_FORMATS: { format: ExportRequest['format']; label: string }[] = [
  { format: 'png', label: 'PNG' },
  { format: 'transparent_png', label: 'Transparent PNG' },
  { format: 'jpg', label: 'JPG' },
  { format: 'print_ready', label: 'Print Ready (300 DPI)' },
]

const ImageDetail: React.FC<ImageDetailProps> = ({ image, open, onClose }) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setMockupImageId, loadPreset, addNotification } = useAppStore()
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [localFavorite, setLocalFavorite] = useState(image.is_favorite)
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)

  const favoriteMutation = useMutation({
    mutationFn: () => imagesApi.toggleFavorite(image.id),
    onSuccess: (data) => {
      setLocalFavorite(data.is_favorite)
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
    },
  })

  const exportMutation = useMutation({
    mutationFn: (format: ExportRequest['format']) => exportApi.exportImage(image.id, { format }),
    onSuccess: (data, format) => {
      addNotification({ type: 'success', title: 'Exported', message: `Saved to: ${data.export_path}` })
      setExportingFormat(null)
    },
    onError: () => {
      addNotification({ type: 'error', title: 'Export Failed' })
      setExportingFormat(null)
    },
  })

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(image.prompt)
    setCopiedPrompt(true)
    setTimeout(() => setCopiedPrompt(false), 2000)
  }

  const handleSendToMockup = () => {
    setMockupImageId(image.id)
    navigate(`/mockup/${image.id}`)
    onClose()
  }

  const handleRemix = () => {
    loadPreset({
      prompt: image.prompt,
      negative_prompt: image.negative_prompt,
      style_tags: [],
      output_style: image.output_style,
      product_type: image.product_type,
    })
    navigate('/workspace')
    onClose()
  }

  const handleExport = (format: ExportRequest['format']) => {
    setExportingFormat(format)
    exportMutation.mutate(format)
  }

  return (
    <Modal open={open} onOpenChange={onClose} size="full" title="Design Detail">
      <div className="flex h-[75vh]">
        {/* Image preview */}
        <div className="flex-1 bg-surface2/50 flex items-center justify-center p-6 relative">
          <img
            src={getImageUrl(image.file_path)}
            alt={image.prompt}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* Metadata panel */}
        <div className="w-72 border-l border-border overflow-y-auto flex flex-col">
          {/* Actions */}
          <div className="p-4 border-b border-border space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant={localFavorite ? 'outline' : 'ghost'}
                size="sm"
                icon={<Star size={14} fill={localFavorite ? 'currentColor' : 'none'} className={localFavorite ? 'text-warning' : ''} />}
                onClick={() => favoriteMutation.mutate()}
                loading={favoriteMutation.isPending}
                className={localFavorite ? 'text-warning border-warning/30' : ''}
              >
                {localFavorite ? 'Favorited' : 'Favorite'}
              </Button>
              <Button variant="ghost" size="sm" icon={<Shirt size={14} />} onClick={handleSendToMockup}>
                Mockup
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              icon={<GitBranch size={14} />}
              onClick={handleRemix}
            >
              Generate More Like This
            </Button>
          </div>

          {/* Export */}
          <div className="p-4 border-b border-border">
            <p className="text-xs font-semibold text-text/60 uppercase tracking-wide mb-2">Export</p>
            <div className="space-y-1.5">
              {EXPORT_FORMATS.map((ef) => (
                <button
                  key={ef.format}
                  onClick={() => handleExport(ef.format)}
                  disabled={!!exportingFormat}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-surface2 transition-all text-xs text-text/70 hover:text-text"
                >
                  <span>{ef.label}</span>
                  <Download size={12} className={exportingFormat === ef.format ? 'text-primary animate-bounce' : 'text-text/30'} />
                </button>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="p-4 space-y-3 flex-1">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-text/60 uppercase tracking-wide">Prompt</p>
                <button onClick={handleCopyPrompt} className="text-text/30 hover:text-text/60">
                  {copiedPrompt ? <CheckCircle size={12} className="text-success" /> : <Copy size={12} />}
                </button>
              </div>
              <p className="text-xs text-text/80 leading-relaxed">{image.prompt}</p>
            </div>

            {image.negative_prompt && (
              <div>
                <p className="text-xs font-semibold text-text/60 uppercase tracking-wide mb-1">Negative</p>
                <p className="text-xs text-text/50 leading-relaxed">{image.negative_prompt}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Product', value: productTypeLabel(image.product_type) },
                { label: 'Style', value: outputStyleLabel(image.output_style) },
                { label: 'Size', value: `${image.width}×${image.height}` },
                { label: 'Steps', value: String(image.steps) },
                { label: 'CFG Scale', value: String(image.guidance_scale) },
                { label: 'Seed', value: String(image.seed) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] text-text/40 font-medium">{item.label}</p>
                  <p className="text-xs text-text font-mono">{item.value}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[10px] text-text/40 font-medium">Created</p>
              <p className="text-xs text-text">{formatDate(image.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default ImageDetail
