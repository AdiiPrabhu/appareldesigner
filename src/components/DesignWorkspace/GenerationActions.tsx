import React, { useEffect, useRef } from 'react'
import { Wand2, Shuffle, GitBranch, Bookmark, X, Clock } from 'lucide-react'
import { randomSeed } from '@/lib/utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { generationApi } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'

interface GenerationActionsProps {
  projectId?: string
  onComplete?: (imageIds: string[]) => void
}

const ESTIMATED_TIME_PER_STEP = 0.5 // seconds on GPU, rough estimate

const GenerationActions: React.FC<GenerationActionsProps> = ({ projectId, onComplete }) => {
  const {
    prompt,
    negativePrompt,
    generationSettings,
    selectedStyleTags,
    selectedReferenceIds,
    activeJob,
    setActiveJob,
    updateActiveJob,
    addPromptToHistory,
    addNotification,
    selectedImageIds,
  } = useAppStore()

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const estimatedSeconds = Math.round(
    generationSettings.steps * ESTIMATED_TIME_PER_STEP * generationSettings.num_outputs
  )

  // Poll job status
  const startPolling = (jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const job = await generationApi.getJob(jobId)
        updateActiveJob(job)
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          if (job.status === 'completed') {
            addNotification({
              type: 'success',
              title: 'Generation Complete',
              message: `${job.result_image_ids.length} image(s) generated.`,
            })
            onComplete?.(job.result_image_ids)
          } else if (job.status === 'failed') {
            addNotification({ type: 'error', title: 'Generation Failed', message: job.error })
          }
        }
      } catch {
        // Polling error — keep trying
      }
    }, 1500)
  }

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const startMutation = useMutation({
    mutationFn: () =>
      generationApi.start({
        project_id: projectId || 'default',
        prompt,
        negative_prompt: negativePrompt,
        settings: {
          ...generationSettings,
          style_tags: selectedStyleTags,
          reference_ids: selectedReferenceIds,
        },
      }),
    onMutate: () => {
      addPromptToHistory(prompt)
    },
    onSuccess: (data) => {
      const jobId = data.job_id
      setActiveJob({
        id: jobId,
        project_id: projectId || 'default',
        status: 'pending',
        prompt,
        negative_prompt: negativePrompt,
        settings: generationSettings,
        progress: 0,
        created_at: new Date().toISOString(),
        result_image_ids: [],
      })
      startPolling(jobId)
    },
    onError: (err: Error) => {
      addNotification({ type: 'error', title: 'Generation Failed', message: err.message })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => generationApi.cancelJob(activeJob!.id),
    onSuccess: () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      setActiveJob(null)
      addNotification({ type: 'info', title: 'Generation Cancelled' })
    },
  })

  const isGenerating = activeJob?.status === 'running' || activeJob?.status === 'pending'
  const canGenerate = prompt.trim().length > 0 && !isGenerating

  return (
    <div className="space-y-3">
      {/* Main generate button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        icon={isGenerating ? <LoadingSpinner size="sm" color="#fff" /> : <Wand2 size={18} />}
        onClick={() => startMutation.mutate()}
        disabled={!canGenerate}
        className={cn(
          'shadow-glow transition-all',
          canGenerate && 'hover:shadow-[0_0_30px_rgba(108,99,255,0.5)]'
        )}
      >
        {isGenerating ? 'Generating...' : 'Generate Design'}
      </Button>

      {/* Secondary actions */}
      {!isGenerating && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            icon={<Shuffle size={13} />}
            disabled={!prompt.trim()}
            onClick={() => {
              useAppStore.getState().setGenerationSettings({ seed: randomSeed() })
              startMutation.mutate()
            }}
          >
            Variations
          </Button>
          <Button
            variant="outline"
            size="sm"
            fullWidth
            icon={<GitBranch size={13} />}
            disabled={selectedImageIds.length === 0}
          >
            Remix
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Bookmark size={13} />}
            disabled={!prompt.trim()}
          >
            Preset
          </Button>
        </div>
      )}

      {/* Progress bar */}
      {isGenerating && activeJob && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LoadingSpinner size="xs" />
              <span className="text-xs text-text/60">
                {activeJob.status === 'pending' ? 'Queued...' : `Generating... ${activeJob.progress}%`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-text/30">
                <Clock size={11} />
                <span>~{estimatedSeconds}s</span>
              </div>
              <Button
                variant="danger"
                size="xs"
                icon={<X size={11} />}
                onClick={() => cancelMutation.mutate()}
                loading={cancelMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
          <div className="w-full bg-surface2 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${activeJob.progress}%` }}
            />
          </div>
          {activeJob.enhanced_prompt && (
            <p className="text-xs text-text/40 italic line-clamp-2">
              Enhanced: {activeJob.enhanced_prompt}
            </p>
          )}
        </div>
      )}

      {/* No model warning */}
      {!isGenerating && (
        <p className="text-xs text-text/30 text-center">
          Requires diffusion model • <span className="text-primary cursor-pointer hover:underline">Setup guide</span>
        </p>
      )}
    </div>
  )
}

export default GenerationActions
