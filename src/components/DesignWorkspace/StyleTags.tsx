import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const PREDEFINED_TAGS = [
  'bold', 'minimal', 'vintage', 'geometric', 'abstract', 'streetwear',
  'nature', 'gothic', 'futuristic', 'japanese', 'tribal', 'grunge',
  'pastel', 'neon', 'monochrome', 'watercolor', 'line-art', 'psychedelic',
  'retro', 'cyberpunk', 'surreal', 'floral', 'dark', 'cosmic',
]

const StyleTags: React.FC = () => {
  const { selectedStyleTags, toggleStyleTag, setSelectedStyleTags } = useAppStore()
  const [customTag, setCustomTag] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleAddCustom = () => {
    const tag = customTag.trim().toLowerCase().replace(/\s+/g, '-')
    if (tag && !selectedStyleTags.includes(tag)) {
      setSelectedStyleTags([...selectedStyleTags, tag])
    }
    setCustomTag('')
    setShowCustomInput(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddCustom()
    if (e.key === 'Escape') {
      setShowCustomInput(false)
      setCustomTag('')
    }
  }

  const customTags = selectedStyleTags.filter((t) => !PREDEFINED_TAGS.includes(t))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Style Tags</label>
        <span className="text-xs text-primary font-mono">
          {selectedStyleTags.length > 0 ? `${selectedStyleTags.length} selected` : 'none'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PREDEFINED_TAGS.map((tag) => {
          const isSelected = selectedStyleTags.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => toggleStyleTag(tag)}
              className={cn(
                'px-2 py-1 rounded-full text-xs transition-all',
                isSelected
                  ? 'bg-primary text-white'
                  : 'bg-surface2 text-text/50 hover:bg-surface2 hover:text-text border border-border hover:border-primary/30'
              )}
            >
              {tag}
            </button>
          )
        })}
        {customTags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-accent/20 text-accent border border-accent/30"
          >
            {tag}
            <button onClick={() => toggleStyleTag(tag)} className="hover:text-white">
              <X size={10} />
            </button>
          </span>
        ))}
        {showCustomInput ? (
          <input
            autoFocus
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleAddCustom}
            placeholder="custom tag..."
            className="px-2 py-1 rounded-full text-xs bg-surface2 border border-primary text-text outline-none w-24"
          />
        ) : (
          <button
            onClick={() => setShowCustomInput(true)}
            className="px-2 py-1 rounded-full text-xs border border-dashed border-border text-text/30 hover:border-primary/50 hover:text-primary transition-all flex items-center gap-1"
          >
            <Plus size={10} />
            Add
          </button>
        )}
      </div>
      {selectedStyleTags.length > 0 && (
        <button
          onClick={() => setSelectedStyleTags([])}
          className="text-xs text-text/30 hover:text-error transition-colors"
        >
          Clear all tags
        </button>
      )}
    </div>
  )
}

export default StyleTags
