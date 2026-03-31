import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FolderOpen, Plus, Trash2, Upload, Tag, Search, Grid2X2, X, FolderPlus
} from 'lucide-react'
import { referencesApi, getThumbnailUrl } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import Slider from '@/components/common/Slider'
import { cn } from '@/lib/utils'
import type { ReferenceCollection, ReferenceImage, ReferenceType } from '@/types'

const REFERENCE_TYPES: { value: ReferenceType; label: string }[] = [
  { value: 'inspiration', label: 'Inspiration' },
  { value: 'composition', label: 'Composition' },
  { value: 'color_palette', label: 'Color Palette' },
  { value: 'texture', label: 'Texture' },
  { value: 'style', label: 'Style' },
]

const DatasetManager: React.FC = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useAppStore()
  const [selectedCollection, setSelectedCollection] = useState<ReferenceCollection | null>(null)
  const [search, setSearch] = useState('')
  const [newCollectionName, setNewCollectionName] = useState('')
  const [showNewCollection, setShowNewCollection] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ReferenceImage | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: collections, isLoading: loadingCollections } = useQuery({
    queryKey: ['reference-collections'],
    queryFn: referencesApi.listCollections,
  })

  const { data: imagesData, isLoading: loadingImages } = useQuery({
    queryKey: ['reference-images', selectedCollection?.id],
    queryFn: () => referencesApi.listImages(selectedCollection!.id, 1, 100),
    enabled: !!selectedCollection,
  })

  const createCollectionMutation = useMutation({
    mutationFn: (name: string) => referencesApi.createCollection({ name }),
    onSuccess: (col) => {
      queryClient.invalidateQueries({ queryKey: ['reference-collections'] })
      setSelectedCollection(col)
      setShowNewCollection(false)
      setNewCollectionName('')
      addNotification({ type: 'success', title: 'Collection Created' })
    },
  })

  const deleteCollectionMutation = useMutation({
    mutationFn: (id: string) => referencesApi.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-collections'] })
      setSelectedCollection(null)
      addNotification({ type: 'success', title: 'Collection Deleted' })
    },
  })

  const deleteImageMutation = useMutation({
    mutationFn: (id: string) => referencesApi.deleteImage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-images', selectedCollection?.id] })
      setSelectedImage(null)
    },
  })

  const updateImageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ReferenceImage> }) =>
      referencesApi.updateImage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-images', selectedCollection?.id] })
    },
  })

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!selectedCollection || acceptedFiles.length === 0) return
      setUploading(true)
      try {
        await referencesApi.uploadImages(selectedCollection.id, acceptedFiles)
        queryClient.invalidateQueries({ queryKey: ['reference-images', selectedCollection.id] })
        queryClient.invalidateQueries({ queryKey: ['reference-collections'] })
        addNotification({ type: 'success', title: 'Images Uploaded', message: `${acceptedFiles.length} added.` })
      } catch {
        addNotification({ type: 'error', title: 'Upload Failed' })
      } finally {
        setUploading(false)
      }
    },
    [selectedCollection]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
    disabled: !selectedCollection,
  })

  const handleAddFolder = async () => {
    if (!selectedCollection || typeof window === 'undefined' || !window.electronAPI) return
    const result = await window.electronAPI.openFolderDialog()
    if (!result.canceled && result.filePaths[0]) {
      try {
        await referencesApi.addFolder(selectedCollection.id, result.filePaths[0])
        queryClient.invalidateQueries({ queryKey: ['reference-images', selectedCollection.id] })
        addNotification({ type: 'success', title: 'Folder Added' })
      } catch {
        addNotification({ type: 'error', title: 'Failed to add folder' })
      }
    }
  }

  const filteredImages = imagesData?.items.filter(
    (img) =>
      !search ||
      img.filename.toLowerCase().includes(search.toLowerCase()) ||
      img.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex h-full overflow-hidden">
      {/* Collections sidebar */}
      <div className="w-56 border-r border-border bg-surface flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-semibold text-text/70">Collections</span>
          <button
            onClick={() => setShowNewCollection(true)}
            className="p-1 rounded hover:bg-surface2 text-text/40 hover:text-text transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {showNewCollection && (
          <div className="px-3 py-2 border-b border-border">
            <input
              autoFocus
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCollectionName.trim()) {
                  createCollectionMutation.mutate(newCollectionName.trim())
                }
                if (e.key === 'Escape') {
                  setShowNewCollection(false)
                  setNewCollectionName('')
                }
              }}
              placeholder="Collection name..."
              className="w-full bg-surface2 border border-primary rounded px-2 py-1 text-xs text-text focus:outline-none"
            />
            <div className="flex gap-1 mt-1.5">
              <Button
                size="xs"
                onClick={() => {
                  if (newCollectionName.trim()) createCollectionMutation.mutate(newCollectionName.trim())
                }}
                loading={createCollectionMutation.isPending}
              >
                Create
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setShowNewCollection(false)
                  setNewCollectionName('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-2">
          {loadingCollections ? (
            <div className="flex justify-center pt-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : collections?.length === 0 ? (
            <p className="text-xs text-text/30 text-center py-4">No collections</p>
          ) : (
            collections?.map((col) => (
              <button
                key={col.id}
                onClick={() => setSelectedCollection(col)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-xs transition-all',
                  selectedCollection?.id === col.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-text/60 hover:bg-surface2 hover:text-text'
                )}
              >
                <span className="flex items-center gap-2">
                  <FolderOpen size={13} />
                  <span className="truncate">{col.name}</span>
                </span>
                <span className="text-text/30 text-[10px]">{col.image_count}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedCollection ? (
          <EmptyState
            icon={<FolderOpen />}
            title="Select a collection"
            description="Choose a collection from the left to view and manage reference images"
            action={{
              label: 'Create Collection',
              onClick: () => setShowNewCollection(true),
              icon: <Plus size={14} />,
            }}
          />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface flex-shrink-0">
              <h3 className="text-sm font-semibold text-text">{selectedCollection.name}</h3>
              <span className="text-xs text-text/30">{imagesData?.total || 0} images</span>
              <div className="flex-1" />
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text/30" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="bg-surface2 border border-border rounded pl-7 pr-2 py-1 text-xs text-text focus:outline-none focus:border-primary/50"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={<FolderPlus size={13} />}
                onClick={handleAddFolder}
              >
                Add Folder
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 size={13} />}
                onClick={() => {
                  if (confirm('Delete this collection and all its images?')) {
                    deleteCollectionMutation.mutate(selectedCollection.id)
                  }
                }}
              >
                Delete
              </Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Images grid */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-4 transition-all',
                    isDragActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/40 hover:bg-surface2/30'
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
                      <Upload size={24} className="mx-auto mb-2 text-text/20" />
                      <p className="text-xs text-text/40">Drop images here or click to upload</p>
                    </>
                  )}
                </div>

                {loadingImages ? (
                  <div className="flex justify-center pt-8">
                    <LoadingSpinner />
                  </div>
                ) : filteredImages?.length === 0 ? (
                  <EmptyState
                    icon={<Grid2X2 />}
                    title="No images"
                    description="Upload images to this collection"
                    compact
                  />
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                    {filteredImages?.map((img) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(img === selectedImage ? null : img)}
                        className={cn(
                          'group relative aspect-square rounded-lg overflow-hidden border transition-all',
                          selectedImage?.id === img.id
                            ? 'border-primary ring-1 ring-primary/50'
                            : 'border-border hover:border-primary/30'
                        )}
                      >
                        <img
                          src={getThumbnailUrl(img.thumbnail_path)}
                          alt={img.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end">
                          <p className="px-1.5 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 line-clamp-1">
                            {img.filename}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Image detail sidebar */}
              {selectedImage && (
                <div className="w-64 border-l border-border bg-surface overflow-y-auto flex-shrink-0">
                  <div className="p-3 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-semibold text-text">Image Properties</span>
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="text-text/30 hover:text-text"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="p-3 space-y-4">
                    <div className="aspect-square rounded-lg overflow-hidden bg-surface2">
                      <img
                        src={getThumbnailUrl(selectedImage.thumbnail_path)}
                        alt={selectedImage.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-text/40">Filename</p>
                      <p className="text-xs text-text truncate">{selectedImage.filename}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-text/40 block mb-1">Type</label>
                      <select
                        value={selectedImage.reference_type}
                        onChange={(e) => {
                          updateImageMutation.mutate({
                            id: selectedImage.id,
                            data: { reference_type: e.target.value as ReferenceType },
                          })
                          setSelectedImage({ ...selectedImage, reference_type: e.target.value as ReferenceType })
                        }}
                        className="w-full bg-surface2 border border-border rounded px-2 py-1 text-xs text-text focus:outline-none"
                      >
                        {REFERENCE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Slider
                      label="Weight"
                      value={selectedImage.weight}
                      min={0}
                      max={1}
                      step={0.05}
                      onChange={(v) => {
                        updateImageMutation.mutate({ id: selectedImage.id, data: { weight: v } })
                        setSelectedImage({ ...selectedImage, weight: v })
                      }}
                      displayValue={selectedImage.weight.toFixed(2)}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      icon={<Trash2 size={13} />}
                      onClick={() => {
                        if (confirm('Delete this reference image?')) {
                          deleteImageMutation.mutate(selectedImage.id)
                        }
                      }}
                      loading={deleteImageMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DatasetManager
