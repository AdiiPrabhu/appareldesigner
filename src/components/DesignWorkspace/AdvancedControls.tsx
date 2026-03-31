import React from 'react'
import { ChevronDown, ChevronUp, Shuffle } from 'lucide-react'
import { HexColorPicker } from 'react-colorful'
import { useAppStore } from '@/store/useAppStore'
import Slider from '@/components/common/Slider'
import { cn, randomSeed, outputStyleLabel } from '@/lib/utils'
import type { OutputStyle, BackgroundMode } from '@/types'

const OUTPUT_STYLES: OutputStyle[] = [
  'flat_graphic', 'streetwear', 'embroidery', 'minimal_vector',
  'vintage_distressed', 'futuristic', 'anime_inspired', 'abstract', 'custom',
]

const BACKGROUND_MODES: { value: BackgroundMode; label: string }[] = [
  { value: 'transparent', label: 'Transparent' },
  { value: 'white', label: 'White' },
  { value: 'solid_color', label: 'Solid Color' },
]

const DIMENSION_PRESETS = [512, 768, 1024]

const AdvancedControls: React.FC = () => {
  const { advancedControlsOpen, setAdvancedControlsOpen, generationSettings, setGenerationSettings } = useAppStore()
  const [showColorPicker, setShowColorPicker] = React.useState(false)

  const settings = generationSettings

  return (
    <div className="bg-surface2 border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setAdvancedControlsOpen(!advancedControlsOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
      >
        <span className="text-xs font-semibold text-text/70 uppercase tracking-wide">Advanced Settings</span>
        {advancedControlsOpen ? (
          <ChevronUp size={14} className="text-text/40" />
        ) : (
          <ChevronDown size={14} className="text-text/40" />
        )}
      </button>

      {advancedControlsOpen && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          <div className="pt-4 grid grid-cols-2 gap-4">
            {/* Width */}
            <div className="space-y-1.5">
              <label className="text-xs text-text/60 font-medium">Width</label>
              <div className="flex gap-1">
                {DIMENSION_PRESETS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setGenerationSettings({ width: w })}
                    className={cn(
                      'flex-1 py-1.5 text-xs rounded border transition-all',
                      settings.width === w
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface border-border text-text/50 hover:border-primary/30'
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Height */}
            <div className="space-y-1.5">
              <label className="text-xs text-text/60 font-medium">Height</label>
              <div className="flex gap-1">
                {DIMENSION_PRESETS.map((h) => (
                  <button
                    key={h}
                    onClick={() => setGenerationSettings({ height: h })}
                    className={cn(
                      'flex-1 py-1.5 text-xs rounded border transition-all',
                      settings.height === h
                        ? 'bg-primary border-primary text-white'
                        : 'bg-surface border-border text-text/50 hover:border-primary/30'
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Seed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-text/60 font-medium">Seed</label>
              <button
                onClick={() => setGenerationSettings({ seed: randomSeed() })}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Shuffle size={11} />
                Randomize
              </button>
            </div>
            <input
              type="number"
              value={settings.seed === -1 ? '' : settings.seed}
              onChange={(e) =>
                setGenerationSettings({ seed: e.target.value === '' ? -1 : parseInt(e.target.value) || -1 })
              }
              placeholder="Random (-1)"
              className="w-full bg-surface border border-border rounded px-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary/50 font-mono"
            />
          </div>

          {/* Steps */}
          <Slider
            label="Inference Steps"
            value={settings.steps}
            min={10}
            max={80}
            step={1}
            onChange={(v) => setGenerationSettings({ steps: v })}
          />

          {/* Guidance Scale */}
          <Slider
            label="Guidance Scale"
            value={settings.guidance_scale}
            min={1}
            max={20}
            step={0.5}
            onChange={(v) => setGenerationSettings({ guidance_scale: v })}
            displayValue={settings.guidance_scale.toFixed(1)}
          />

          {/* Creativity */}
          <Slider
            label="Creativity"
            value={settings.creativity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setGenerationSettings({ creativity: v })}
            displayValue={settings.creativity.toFixed(2)}
          />

          {/* Reference Strength */}
          <Slider
            label="Reference Strength"
            value={settings.reference_strength}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => setGenerationSettings({ reference_strength: v })}
            displayValue={settings.reference_strength.toFixed(2)}
          />

          {/* Num outputs */}
          <div className="space-y-1.5">
            <label className="text-xs text-text/60 font-medium">Number of Outputs</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setGenerationSettings({ num_outputs: n })}
                  className={cn(
                    'flex-1 py-1.5 text-xs rounded border transition-all',
                    settings.num_outputs === n
                      ? 'bg-primary border-primary text-white'
                      : 'bg-surface border-border text-text/50 hover:border-primary/30'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Output Style */}
          <div className="space-y-1.5">
            <label className="text-xs text-text/60 font-medium">Output Style</label>
            <select
              value={settings.output_style}
              onChange={(e) => setGenerationSettings({ output_style: e.target.value as OutputStyle })}
              className="w-full bg-surface border border-border rounded px-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary/50"
            >
              {OUTPUT_STYLES.map((style) => (
                <option key={style} value={style}>
                  {outputStyleLabel(style)}
                </option>
              ))}
            </select>
          </div>

          {/* Background Mode */}
          <div className="space-y-1.5">
            <label className="text-xs text-text/60 font-medium">Background</label>
            <div className="flex gap-1.5">
              {BACKGROUND_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setGenerationSettings({ background_mode: mode.value })}
                  className={cn(
                    'flex-1 py-1.5 text-xs rounded border transition-all',
                    settings.background_mode === mode.value
                      ? 'bg-primary border-primary text-white'
                      : 'bg-surface border-border text-text/50 hover:border-primary/30'
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {settings.background_mode === 'solid_color' && (
              <div className="relative mt-2">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 bg-surface border border-border rounded text-xs text-text hover:border-primary/50"
                >
                  <div
                    className="w-4 h-4 rounded border border-border"
                    style={{ backgroundColor: settings.solid_color || '#ffffff' }}
                  />
                  <span>{settings.solid_color || '#ffffff'}</span>
                </button>
                {showColorPicker && (
                  <div className="absolute z-20 mt-1">
                    <div className="fixed inset-0" onClick={() => setShowColorPicker(false)} />
                    <div className="relative z-30">
                      <HexColorPicker
                        color={settings.solid_color || '#ffffff'}
                        onChange={(color) => setGenerationSettings({ solid_color: color })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-text/60">Enhance prompt with AI</span>
              <div
                onClick={() => setGenerationSettings({ enhance_prompt: !settings.enhance_prompt })}
                className={cn(
                  'w-9 h-5 rounded-full transition-colors cursor-pointer relative',
                  settings.enhance_prompt ? 'bg-primary' : 'bg-border'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    settings.enhance_prompt ? 'left-[18px]' : 'left-0.5'
                  )}
                />
              </div>
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-text/60">Safety check</span>
              <div
                onClick={() => setGenerationSettings({ safety_check: !settings.safety_check })}
                className={cn(
                  'w-9 h-5 rounded-full transition-colors cursor-pointer relative',
                  settings.safety_check ? 'bg-primary' : 'bg-border'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                    settings.safety_check ? 'left-[18px]' : 'left-0.5'
                  )}
                />
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedControls
