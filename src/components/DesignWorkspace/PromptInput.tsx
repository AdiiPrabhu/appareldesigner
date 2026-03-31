import React, { useRef, useState } from 'react'
import { Wand2, Shield, Clock, ChevronDown, Copy, CheckCircle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { generationApi } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import SafetyWarning from '@/components/Safety/SafetyWarning'
import { cn } from '@/lib/utils'
import type { SafetyCheckResult } from '@/types'

interface PromptInputProps {
  onGenerate: () => void
  isGenerating: boolean
}

const MAX_PROMPT_LENGTH = 500

const PromptInput: React.FC<PromptInputProps> = ({ onGenerate, isGenerating }) => {
  const {
    prompt,
    negativePrompt,
    setPrompt,
    setNegativePrompt,
    promptHistory,
    generationSettings,
    addNotification,
  } = useAppStore()

  const [showHistory, setShowHistory] = useState(false)
  const [safetyResult, setSafetyResult] = useState<SafetyCheckResult | null>(null)
  const [showSafetyModal, setShowSafetyModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const enhanceMutation = useMutation({
    mutationFn: () =>
      generationApi.enhancePrompt({
        prompt,
        product_type: generationSettings.product_type,
        style_tags: generationSettings.style_tags,
        output_style: generationSettings.output_style,
      }),
    onSuccess: (result) => {
      setPrompt(result.enhanced_prompt)
      if (result.negative_prompt && !negativePrompt) {
        setNegativePrompt(result.negative_prompt)
      }
      addNotification({ type: 'success', title: 'Prompt Enhanced', message: 'AI has improved your prompt.' })
    },
    onError: () => {
      addNotification({ type: 'error', title: 'Enhancement Failed', message: 'Ollama may not be running.' })
    },
  })

  const safetyMutation = useMutation({
    mutationFn: () => generationApi.safetyCheck(prompt),
    onSuccess: (result) => {
      setSafetyResult(result)
      if (!result.is_safe || result.risk_level !== 'none') {
        setShowSafetyModal(true)
      } else {
        addNotification({ type: 'success', title: 'Safety Check Passed', message: 'No copyright concerns detected.' })
      }
    },
    onError: () => {
      addNotification({ type: 'warning', title: 'Safety Check Failed', message: 'Could not verify prompt safety.' })
    },
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (!isGenerating && prompt.trim()) {
        onGenerate()
      }
    }
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleUseSuggested = (suggested: string) => {
    setPrompt(suggested)
    setShowSafetyModal(false)
  }

  return (
    <div className="space-y-3">
      {/* Main prompt */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Design Prompt</label>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs', prompt.length > MAX_PROMPT_LENGTH * 0.8 ? 'text-warning' : 'text-text/30')}>
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </span>
            {prompt && (
              <button onClick={handleCopyPrompt} className="text-text/30 hover:text-text/60 transition-colors">
                {copied ? <CheckCircle size={12} className="text-success" /> : <Copy size={12} />}
              </button>
            )}
            {promptHistory.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1 text-xs text-text/30 hover:text-text/60 transition-colors"
                >
                  <Clock size={12} />
                  <ChevronDown size={10} />
                </button>
                {showHistory && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-surface border border-border rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="px-3 py-2 border-b border-border">
                      <span className="text-xs text-text/50 font-medium">Recent prompts</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {promptHistory.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setPrompt(p)
                            setShowHistory(false)
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-text/70 hover:bg-surface2 hover:text-text transition-colors line-clamp-2"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
          onKeyDown={handleKeyDown}
          placeholder="Describe your apparel design concept... e.g., 'geometric mountain landscape with aurora borealis colors, bold linework, suitable for screen printing'"
          className="w-full bg-surface2 border border-border rounded-lg px-3 py-3 text-sm text-text placeholder:text-text/30 focus:outline-none focus:border-primary/50 resize-none min-h-[120px]"
          rows={5}
        />
      </div>

      {/* Prompt actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          icon={enhanceMutation.isPending ? <LoadingSpinner size="xs" /> : <Wand2 size={13} />}
          onClick={() => {
            if (prompt.trim()) enhanceMutation.mutate()
          }}
          disabled={!prompt.trim() || enhanceMutation.isPending}
        >
          {enhanceMutation.isPending ? 'Enhancing...' : 'Enhance with AI'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={safetyMutation.isPending ? <LoadingSpinner size="xs" /> : <Shield size={13} />}
          onClick={() => {
            if (prompt.trim()) safetyMutation.mutate()
          }}
          disabled={!prompt.trim() || safetyMutation.isPending}
        >
          {safetyMutation.isPending ? 'Checking...' : 'Safety Check'}
        </Button>
        <span className="text-xs text-text/20 ml-auto hidden sm:block">Ctrl+Enter to generate</span>
      </div>

      {/* Safety inline warning */}
      {safetyResult && !showSafetyModal && safetyResult.risk_level !== 'none' && (
        <div className={cn(
          'flex items-start gap-2 p-3 rounded-lg border text-xs',
          safetyResult.risk_level === 'high'
            ? 'bg-error/10 border-error/30 text-error'
            : 'bg-warning/10 border-warning/30 text-warning'
        )}>
          <Shield size={13} className="flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Risk: {safetyResult.risk_level}</span>
            {safetyResult.blocked_terms.length > 0 && (
              <span className="ml-1 text-text/50">— {safetyResult.blocked_terms.join(', ')}</span>
            )}
            {safetyResult.suggested_prompt && (
              <button
                onClick={() => handleUseSuggested(safetyResult.suggested_prompt!)}
                className="block mt-1 text-primary hover:underline"
              >
                Use suggested prompt
              </button>
            )}
          </div>
        </div>
      )}

      {/* Negative prompt */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text/60 uppercase tracking-wide">Negative Prompt</label>
        <textarea
          value={negativePrompt}
          onChange={(e) => setNegativePrompt(e.target.value)}
          placeholder="Things to avoid... e.g., 'text, watermark, blurry, low quality, photorealistic'"
          className="w-full bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text/30 focus:outline-none focus:border-primary/30 resize-none min-h-[70px]"
          rows={3}
        />
      </div>

      {/* Safety Modal */}
      <SafetyWarning
        open={showSafetyModal}
        onClose={() => setShowSafetyModal(false)}
        result={safetyResult}
        originalPrompt={prompt}
        onUseSuggested={handleUseSuggested}
        onKeepOriginal={() => setShowSafetyModal(false)}
      />
    </div>
  )
}

export default PromptInput
