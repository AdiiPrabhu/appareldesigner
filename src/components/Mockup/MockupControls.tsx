import React, { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { RotateCcw, RotateCw, Download, RefreshCw } from 'lucide-react'
import Button from '@/components/common/Button'
import { cn } from '@/lib/utils'
import type { MockupPlacement, ProductType } from '@/types'

const GARMENT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'tshirt', label: 'T-Shirt' },
  { value: 'hoodie', label: 'Hoodie' },
  { value: 'jacket', label: 'Jacket' },
  { value: 'sweatshirt', label: 'Sweatshirt' },
]

const PLACEMENT_ZONES: { value: MockupPlacement['placement_zone']; label: string }[] = [
  { value: 'front', label: 'Front Center' },
  { value: 'back', label: 'Back Center' },
  { value: 'left_chest', label: 'Left Chest' },
  { value: 'right_chest', label: 'Right Chest' },
]

const PRESET_COLORS = [
  '#ffffff', '#000000', '#1a1a2e', '#4a4a4a',
  '#ff0000', '#0000ff', '#008000', '#800080',
  '#ffa500', '#ffff00', '#00ffff', '#ff69b4',
]

interface MockupControlsProps {
  placement: MockupPlacement
  onPlacementChange: (update: Partial<MockupPlacement>) => void
  onExport: () => void
  isExporting: boolean
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  hasDesign: boolean
}

const MockupControls: React.FC<MockupControlsProps> = ({
  placement,
  onPlacementChange,
  onExport,
  isExporting,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasDesign,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleNumericInput = (
    field: keyof MockupPlacement,
    value: string,
    transform?: (v: number) => number
  ) => {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      onPlacementChange({ [field]: transform ? transform(num) : num })
    }
  }

  return (
    <div className="p-4 space-y-5">
      {/* Undo / Redo */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw size={13} />}
          disabled={!canUndo}
          onClick={onUndo}
          fullWidth
        >
          Undo
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCw size={13} />}
          disabled={!canRedo}
          onClick={onRedo}
          fullWidth
        >
          Redo
        </Button>
      </div>

      {/* Garment type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Garment</label>
        <div className="grid grid-cols-2 gap-1.5">
          {GARMENT_TYPES.map((g) => (
            <button
              key={g.value}
              onClick={() => onPlacementChange({ garment_type: g.value })}
              className={cn(
                'py-1.5 text-xs rounded border transition-all',
                placement.garment_type === g.value
                  ? 'bg-primary border-primary text-white'
                  : 'bg-surface2 border-border text-text/50 hover:border-primary/30'
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Placement zone */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Zone</label>
        <div className="space-y-1">
          {PLACEMENT_ZONES.map((z) => (
            <button
              key={z.value}
              onClick={() => onPlacementChange({ placement_zone: z.value })}
              className={cn(
                'w-full text-left py-1.5 px-3 text-xs rounded border transition-all',
                placement.placement_zone === z.value
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-surface2 border-border text-text/50 hover:border-primary/30'
              )}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* Position */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-text/40">X</label>
            <input
              type="number"
              value={Math.round(placement.x)}
              onChange={(e) => handleNumericInput('x', e.target.value)}
              className="w-full bg-surface2 border border-border rounded px-2 py-1 text-xs text-text font-mono focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-[10px] text-text/40">Y</label>
            <input
              type="number"
              value={Math.round(placement.y)}
              onChange={(e) => handleNumericInput('y', e.target.value)}
              className="w-full bg-surface2 border border-border rounded px-2 py-1 text-xs text-text font-mono focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Scale */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Scale</label>
          <span className="text-xs text-primary font-mono">{(placement.scale * 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={0.05}
          max={2}
          step={0.01}
          value={placement.scale}
          onChange={(e) => onPlacementChange({ scale: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Rotation */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Rotation</label>
          <span className="text-xs text-primary font-mono">{placement.rotation.toFixed(1)}°</span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          step={0.5}
          value={placement.rotation}
          onChange={(e) => onPlacementChange({ rotation: parseFloat(e.target.value) })}
          className="w-full"
        />
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onPlacementChange({ rotation: 0 })}
          className="text-text/30"
        >
          Reset rotation
        </Button>
      </div>

      {/* Garment Color */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Garment Color</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onPlacementChange({ garment_color: color })}
              className={cn(
                'w-6 h-6 rounded border-2 transition-all',
                placement.garment_color === color ? 'border-primary scale-110' : 'border-border hover:scale-110'
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-2 w-full px-3 py-1.5 bg-surface2 border border-border rounded text-xs text-text hover:border-primary/50"
          >
            <div
              className="w-4 h-4 rounded border border-border"
              style={{ backgroundColor: placement.garment_color }}
            />
            <span>{placement.garment_color}</span>
          </button>
          {showColorPicker && (
            <div className="absolute bottom-full mb-1 z-20">
              <div className="fixed inset-0" onClick={() => setShowColorPicker(false)} />
              <div className="relative z-30">
                <HexColorPicker
                  color={placement.garment_color}
                  onChange={(color) => onPlacementChange({ garment_color: color })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset placement */}
      <Button
        variant="ghost"
        size="sm"
        icon={<RefreshCw size={13} />}
        fullWidth
        onClick={() =>
          onPlacementChange({
            x: 150,
            y: 180,
            scale: 0.4,
            rotation: 0,
          })
        }
      >
        Reset Placement
      </Button>

      {/* Export */}
      <Button
        variant="primary"
        size="md"
        fullWidth
        icon={<Download size={14} />}
        onClick={onExport}
        loading={isExporting}
        disabled={!hasDesign}
      >
        Export Mockup
      </Button>
    </div>
  )
}

export default MockupControls
