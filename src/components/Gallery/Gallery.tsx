import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Filter, Star, Download, Trash2, Grid2X2, LayoutGrid } from 'lucide-react'
import { imagesApi, projectsApi, exportApi } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import ImageCard from './ImageCard'
import ImageDetail from './ImageDetail'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import EmptyState from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'
import type { GeneratedImage, GalleryFilters, ProductType } from '@/types'

const PRODUCT_TYPES: { value: ProductType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'tshirt', label: 'T-Shirt' },
  { value: 'hoodie', label: 'Hoodie' },
  { value: 'jacket', label: 'Jacket' },
  { value: 'sweatshirt', label: 'Sweatshirt' },
  { value: 'cap', label: 'Cap' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'favorites', label: 'Favorites First' },
]

const Gallery: React.FC = () => {
  const queryClient = useQueryClient()
  const { selectedImageIds, toggleSelectedImage, clearSelectedImages, addNotification } = useAppStore()

  const [filters, setFilters] = useState<GalleryFilters>({
    sort: 'newest',
    page: 1,
    page_size: 40,
  })
  const [searchInput, setSearchInput] = useState('')
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [gridSize, setGridSize] = useState<'sm' | 'md'>('md')

  const { data: imagesData, isLoading } = useQuery({
    queryKey: ['gallery', filters],
    queryFn: () => imagesApi.list(filters),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(1, 50),
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => imagesApi.delete(id))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] })
      clearSelectedImages()
      addNotification({ type: 'success', title: 'Deleted', message: 'Images removed.' })
    },
  })

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setFilters((f) => ({ ...f, search: searchInput, page: 1 }))
    }
  }

  const handleFilterChange = (update: Partial<GalleryFilters>) => {
    setFilters((f) => ({ ...f, ...update, page: 1 }))
  }

  const handleDeleteSelected = () => {
    if (selectedImageIds.length === 0) return
    if (confirm(`Delete ${selectedImageIds.length} image(s)?`)) {
      deleteMutation.mutate(selectedImageIds)
    }
  }

  const handleExportSelected = async () => {
    for (const id of selectedImageIds) {
      await exportApi.exportImage(id, { format: 'png' })
    }
    addNotification({ type: 'success', title: 'Exported', message: `${selectedImageIds.length} image(s) exported.` })
    clearSelectedImages()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Filter bar */}
      <div className="bg-surface border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0 flex-wrap gap-y-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text/30" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search prompts..."
            className="w-full bg-surface2 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text placeholder:text-text/30 focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Project filter */}
        <select
          value={filters.project_id || ''}
          onChange={(e) => handleFilterChange({ project_id: e.target.value || undefined })}
          className="bg-surface2 border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:outline-none focus:border-primary/50"
        >
          <option value="">All Projects</option>
          {projectsData?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Product type */}
        <select
          value={filters.product_type || ''}
          onChange={(e) =>
            handleFilterChange({ product_type: (e.target.value as ProductType) || undefined })
          }
          className="bg-surface2 border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:outline-none focus:border-primary/50"
        >
          {PRODUCT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Favorites only */}
        <button
          onClick={() => handleFilterChange({ favorites_only: !filters.favorites_only })}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all',
            filters.favorites_only
              ? 'bg-warning/20 border-warning/40 text-warning'
              : 'bg-surface2 border-border text-text/50 hover:border-primary/30'
          )}
        >
          <Star size={12} />
          Favorites
        </button>

        {/* Sort */}
        <select
          value={filters.sort || 'newest'}
          onChange={(e) => handleFilterChange({ sort: e.target.value as GalleryFilters['sort'] })}
          className="bg-surface2 border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:outline-none focus:border-primary/50"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        {/* Grid size */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setGridSize('sm')}
            className={cn('p-1.5 rounded', gridSize === 'sm' ? 'text-primary bg-primary/10' : 'text-text/30 hover:text-text')}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setGridSize('md')}
            className={cn('p-1.5 rounded', gridSize === 'md' ? 'text-primary bg-primary/10' : 'text-text/30 hover:text-text')}
          >
            <Grid2X2 size={14} />
          </button>
        </div>

        {/* Batch actions */}
        {selectedImageIds.length > 0 && (
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <span className="text-xs text-text/50">{selectedImageIds.length} selected</span>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={12} />}
              onClick={handleExportSelected}
            >
              Export
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={12} />}
              onClick={handleDeleteSelected}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelectedImages}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Gallery grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center pt-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : !imagesData?.items.length ? (
          <EmptyState
            icon={<LayoutGrid />}
            title="No designs found"
            description={
              filters.favorites_only
                ? 'No favorites yet. Star designs to save them here.'
                : filters.search
                ? `No results for "${filters.search}"`
                : 'Generate some designs to fill your gallery.'
            }
          />
        ) : (
          <>
            <div
              className={cn(
                'grid gap-3',
                gridSize === 'sm'
                  ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]'
                  : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'
              )}
            >
              {imagesData.items.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  selected={selectedImageIds.includes(image.id)}
                  onSelect={() => toggleSelectedImage(image.id)}
                  onOpen={() => {
                    setSelectedImage(image)
                    setShowDetail(true)
                  }}
                  compact={gridSize === 'sm'}
                />
              ))}
            </div>

            {/* Pagination */}
            {imagesData.total > (filters.page_size || 40) && (
              <div className="flex justify-center mt-6 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(filters.page || 1) <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-xs text-text/50">
                  Page {filters.page || 1} of {Math.ceil(imagesData.total / (filters.page_size || 40))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    (filters.page || 1) >= Math.ceil(imagesData.total / (filters.page_size || 40))
                  }
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image detail modal */}
      {showDetail && selectedImage && (
        <ImageDetail
          image={selectedImage}
          open={showDetail}
          onClose={() => {
            setShowDetail(false)
            queryClient.invalidateQueries({ queryKey: ['gallery'] })
          }}
        />
      )}
    </div>
  )
}

export default Gallery
