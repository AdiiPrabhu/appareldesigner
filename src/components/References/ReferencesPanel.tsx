import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, X, Plus, Trash2, FolderOpen } from 'lucide-react'
import { referencesApi, getThumbnailUrl } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Slider from '@/components/common/Slider'
import { cn } from '@/lib/utils'
import type { ReferenceType, ReferenceImage } from '@/types'

const REFERENCE_TYPES: { value: ReferenceType; label: string }[] = [
  { value: 'inspiration', label: 'Inspiration' },
  { value: 'composition', label: 'Composition' },
  { value: 'color_palette', label: 'Color' },
  { value: 'texture', label: 'Texture' },
  { value: 'style', label: 'Style' },
]

const ReferencesPanel: React.FC = () => {
  const queryClient = useQueryClient()
  const { workspaceReferences, addWorkspaceReference, removeWorkspaceReference, clearWorkspaceReferences, toggleReferenceId, selectedReferenceIds, addNotification } = useAppStore()
  const [uploading, setUploading] = useState(false)
  const [defaultCollectionId, setDefaultCollectionId] = useState<string | null>(null)

  const { data: collections } = useQuery({
    queryKey: ['reference-collections'],
    queryFn: referencesApi.listCollections,
  })

  // Ensure a default collection exists
  const ensureCollection = async (): Promise<string> => {
    if (defaultCollectionId) return defaultCollectionId
    if (collections && collections.length > 0) {
      setDefaultCollectionId(collections[0].id)
      return collections[0].id
    }
    const newCol = await referencesApi.createCollection({
      name: 'Workspace References',
      description: 'Auto-created workspace reference collection',
    })
    queryClient.invalidateQueries({ queryKey: ['reference-collections'] })
    setDefaultCollectionId(newCol.id)
    return newCol.id
  }

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return
      setUploading(true)
      try {
        const collectionId = await ensureCollection()
        const uploaded = await referencesApi.uploadImages(collectionId, acceptedFiles, 'inspiration')
        uploaded.forEach((ref) => {
          addWorkspaceReference(ref)
          toggleReferenceId(ref.id)
        })
        addNotification({ type: 'success', title: 'References Added', message: `${uploaded.length} image(s) added.` })
      } catch {
        addNotification({ type: 'error', title: 'Upload Failed' })
      } finally {
        setUploading(false)
      }
    },
    [collections, defaultCollectionId]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
  })

  const updateRefMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ReferenceImage> }) =>
      referencesApi.updateImage(id, data),
    onSuccess: (updated) => {
      addWorkspaceReference(updated)
    },
  })

  return (
    <div className="p-3 space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/40 hover:bg-surface2/50'
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-xs text-text/50">Uploading...</span>
          </div>
        ) : (
          <>
            <Upload size={20} className={cn('mx-auto mb-1', isDragActive ? 'text-primary' : 'text-text/30')} />
            <p className="text-xs text-text/50">Drop images or click to upload</p>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={clearWorkspaceReferences}
          className="flex items-center gap-1 text-xs text-error/60 hover:text-error transition-colors"
          disabled={workspaceReferences.length === 0}
        >
          <Trash2 size={11} />
          Clear all
        </button>
        <span className="text-text/20 text-xs ml-auto">{workspaceReferences.length} refs</span>
      </div>

      {/* Reference cards */}
      {workspaceReferences.length === 0 ? (
        <p className="text-xs text-text/30 text-center py-4">No references added yet</p>
      ) : (
        <div className="space-y-2">
          {workspaceReferences.map((ref) => {
            const isSelected = selectedReferenceIds.includes(ref.id)
            return (
              <div
                key={ref.id}
                className={cn(
                  'bg-surface2 border rounded-lg overflow-hidden transition-all',
                  isSelected ? 'border-primary/50' : 'border-border'
                )}
              >
                <div className="flex items-start gap-2 p-2">
                  <div
                    className="w-12 h-12 rounded flex-shrink-0 bg-surface overflow-hidden cursor-pointer"
                    onClick={() => toggleReferenceId(ref.id)}
                  >
                    <img
                      src={getThumbnailUrl(ref.thumbnail_path)}
                      alt={ref.filename}
                      className={cn('w-full h-full object-cover', isSelected ? 'opacity-100' : 'opacity-60')}
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-[10px] text-text/60 truncate">{ref.filename}</p>
                    <select
                      value={ref.reference_type}
                      onChange={(e) =>
                        updateRefMutation.mutate({
                          id: ref.id,
                          data: { reference_type: e.target.value as ReferenceType },
                        })
                      }
                      className="w-full bg-surface border border-border rounded px-1.5 py-0.5 text-[10px] text-text focus:outline-none"
                    >
                      {REFERENCE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      removeWorkspaceReference(ref.id)
                      toggleReferenceId(ref.id)
                    }}
                    className="text-text/20 hover:text-error transition-colors flex-shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="px-2 pb-2">
                  <Slider
                    label="Weight"
                    value={ref.weight}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) =>
                      updateRefMutation.mutate({ id: ref.id, data: { weight: v } })
                    }
                    displayValue={ref.weight.toFixed(2)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add from collection */}
      {collections && collections.length > 0 && (
        <div>
          <p className="text-xs text-text/40 mb-2">Add from collection:</p>
          <div className="space-y-1">
            {collections.map((col) => (
              <button
                key={col.id}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-surface2 hover:bg-surface border border-border text-xs text-text/60 hover:text-text transition-all"
                onClick={async () => {
                  const images = await referencesApi.listImages(col.id)
                  images.items.forEach((img) => {
                    addWorkspaceReference(img)
                  })
                }}
              >
                <span className="flex items-center gap-1.5">
                  <FolderOpen size={12} />
                  {col.name}
                </span>
                <span className="text-text/30">{col.image_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReferencesPanel
