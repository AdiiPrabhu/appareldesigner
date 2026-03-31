import React from 'react'
import { AlertTriangle, Shield, Copy, CheckCircle } from 'lucide-react'
import Modal from '@/components/common/Modal'
import Button from '@/components/common/Button'
import { cn } from '@/lib/utils'
import type { SafetyCheckResult } from '@/types'

interface SafetyWarningProps {
  open: boolean
  onClose: () => void
  result: SafetyCheckResult | null
  originalPrompt: string
  onUseSuggested: (prompt: string) => void
  onKeepOriginal: () => void
}

const RISK_COLORS = {
  none: 'text-success border-success/30 bg-success/10',
  low: 'text-warning border-warning/30 bg-warning/10',
  medium: 'text-warning border-warning/30 bg-warning/10',
  high: 'text-error border-error/30 bg-error/10',
}

const SafetyWarning: React.FC<SafetyWarningProps> = ({
  open,
  onClose,
  result,
  originalPrompt,
  onUseSuggested,
  onKeepOriginal,
}) => {
  const [copiedOriginal, setCopiedOriginal] = React.useState(false)
  const [copiedSuggested, setCopiedSuggested] = React.useState(false)

  if (!result) return null

  const handleCopy = (text: string, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onClose}
      title="Copyright Risk Assessment"
      size="md"
    >
      <div className="p-5 space-y-4">
        {/* Risk level badge */}
        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border',
            RISK_COLORS[result.risk_level]
          )}
        >
          <AlertTriangle size={20} className="flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">
              Risk Level: {result.risk_level.charAt(0).toUpperCase() + result.risk_level.slice(1)}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {result.risk_level === 'none' && 'No copyright concerns detected.'}
              {result.risk_level === 'low' && 'Minor concerns — review recommended before commercial use.'}
              {result.risk_level === 'medium' && 'Moderate concerns — modifications recommended.'}
              {result.risk_level === 'high' && 'Significant concerns — prompt modification strongly advised.'}
            </p>
          </div>
        </div>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-text/60 uppercase tracking-wide mb-2">Warnings</p>
            <ul className="space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-xs text-text/70 flex items-start gap-2">
                  <span className="text-warning mt-0.5">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Blocked terms */}
        {result.blocked_terms.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-text/60 uppercase tracking-wide mb-2">Detected Terms</p>
            <div className="flex flex-wrap gap-1.5">
              {result.blocked_terms.map((term) => (
                <span
                  key={term}
                  className="px-2 py-0.5 rounded text-[10px] bg-error/10 border border-error/30 text-error font-mono"
                >
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Original prompt */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-text/60 uppercase tracking-wide">Original Prompt</p>
            <button
              onClick={() => handleCopy(originalPrompt, setCopiedOriginal)}
              className="text-text/30 hover:text-text/60"
            >
              {copiedOriginal ? <CheckCircle size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>
          <div className="bg-surface2 border border-border rounded-lg p-3">
            <p className="text-xs text-text/70">{originalPrompt}</p>
          </div>
        </div>

        {/* Suggested prompt */}
        {result.suggested_prompt && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-success uppercase tracking-wide">Suggested Prompt</p>
              <button
                onClick={() => handleCopy(result.suggested_prompt!, setCopiedSuggested)}
                className="text-text/30 hover:text-text/60"
              >
                {copiedSuggested ? <CheckCircle size={12} className="text-success" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="bg-success/5 border border-success/20 rounded-lg p-3">
              <p className="text-xs text-text/70">{result.suggested_prompt}</p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-surface2 border border-border rounded-lg p-3 text-[10px] text-text/40 leading-relaxed">
          <Shield size={12} className="inline mr-1.5 text-text/30" />
          <strong>Disclaimer:</strong> This filter reduces copyright risk but cannot guarantee completely copyright-free output. Always review designs before commercial use. AI-generated art may unintentionally reproduce protected visual elements.
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {result.suggested_prompt ? (
            <Button
              variant="primary"
              fullWidth
              onClick={() => onUseSuggested(result.suggested_prompt!)}
            >
              Use Suggested Prompt
            </Button>
          ) : null}
          <Button
            variant={result.risk_level === 'high' ? 'danger' : 'outline'}
            fullWidth
            onClick={onKeepOriginal}
          >
            {result.risk_level === 'high' ? 'Keep Original (Risk)' : 'Keep Original'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SafetyWarning
