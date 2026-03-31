import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Server, Zap, Image, Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { settingsApi } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import Button from '@/components/common/Button'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'
import type { AppSettings, ProductType, OutputStyle } from '@/types'

const PRODUCT_TYPES: ProductType[] = ['tshirt', 'hoodie', 'jacket', 'sweatshirt', 'cap', 'custom']
const OUTPUT_STYLES: OutputStyle[] = [
  'flat_graphic', 'streetwear', 'embroidery', 'minimal_vector',
  'vintage_distressed', 'futuristic', 'anime_inspired', 'abstract', 'custom',
]

const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { addNotification } = useAppStore()
  const [localSettings, setLocalSettings] = useState<Partial<AppSettings>>({})
  const [ollamaTestResult, setOllamaTestResult] = useState<{ connected: boolean; message: string } | null>(null)
  const [modelTestResult, setModelTestResult] = useState<{ loaded: boolean; message: string } | null>(null)
  const [testingOllama, setTestingOllama] = useState(false)
  const [testingModel, setTestingModel] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })

  // Sync local settings when data arrives
  React.useEffect(() => {
    if (settings && Object.keys(localSettings).length === 0) {
      setLocalSettings(settings)
    }
  }, [settings])

  const { data: models } = useQuery({
    queryKey: ['ollama-models'],
    queryFn: settingsApi.listModels,
    retry: false,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AppSettings>) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      addNotification({ type: 'success', title: 'Settings Saved' })
    },
    onError: () => {
      addNotification({ type: 'error', title: 'Failed to Save Settings' })
    },
  })

  const handleChange = (key: keyof AppSettings, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    updateMutation.mutate(localSettings)
  }

  const handleTestOllama = async () => {
    setTestingOllama(true)
    try {
      const result = await settingsApi.testOllama(
        localSettings.ollama_host,
        localSettings.ollama_model
      )
      setOllamaTestResult(result)
    } catch {
      setOllamaTestResult({ connected: false, message: 'Connection failed' })
    } finally {
      setTestingOllama(false)
    }
  }

  const handleTestModel = async () => {
    setTestingModel(true)
    try {
      const result = await settingsApi.testImageModel(localSettings.image_model)
      setModelTestResult(result)
    } catch {
      setModelTestResult({ loaded: false, message: 'Model test failed' })
    } finally {
      setTestingModel(false)
    }
  }

  const merged = { ...settings, ...localSettings }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-text">Settings</h2>
            <p className="text-sm text-text/40 mt-1">Configure your Apparel Design Studio</p>
          </div>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={updateMutation.isPending}
            icon={<Settings size={15} />}
          >
            Save Settings
          </Button>
        </div>

        {/* Backend */}
        <Section title="Backend" icon={<Server size={16} />}>
          <Field label="Backend Port">
            <input
              type="number"
              value={merged.backend_port || 8765}
              onChange={(e) => handleChange('backend_port', parseInt(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Storage Path">
            <input
              type="text"
              value={merged.storage_path || './data'}
              onChange={(e) => handleChange('storage_path', e.target.value)}
              className={inputClass}
              placeholder="./data"
            />
          </Field>
        </Section>

        {/* Ollama */}
        <Section title="Ollama LLM" icon={<Zap size={16} />}>
          <Field label="Ollama Host URL">
            <input
              type="text"
              value={merged.ollama_host || 'http://localhost:11434'}
              onChange={(e) => handleChange('ollama_host', e.target.value)}
              className={inputClass}
              placeholder="http://localhost:11434"
            />
          </Field>
          <Field label="Ollama Model">
            {models && models.length > 0 ? (
              <select
                value={merged.ollama_model || ''}
                onChange={(e) => handleChange('ollama_model', e.target.value)}
                className={inputClass}
              >
                <option value="">Select model...</option>
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={merged.ollama_model || 'llama3.2'}
                onChange={(e) => handleChange('ollama_model', e.target.value)}
                className={inputClass}
                placeholder="llama3.2"
              />
            )}
          </Field>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={testingOllama ? <LoadingSpinner size="xs" /> : <RefreshCw size={13} />}
              onClick={handleTestOllama}
              disabled={testingOllama}
            >
              Test Connection
            </Button>
            {ollamaTestResult && (
              <div className="flex items-center gap-1.5 text-xs">
                {ollamaTestResult.connected ? (
                  <CheckCircle size={13} className="text-success" />
                ) : (
                  <XCircle size={13} className="text-error" />
                )}
                <span className={ollamaTestResult.connected ? 'text-success' : 'text-error'}>
                  {ollamaTestResult.message}
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* Image Generation */}
        <Section title="Image Generation" icon={<Image size={16} />}>
          <div className="p-3 bg-surface2 rounded-lg border border-border text-xs text-text/60 leading-relaxed mb-3">
            <strong className="text-text">Architecture Note:</strong> Ollama handles text (prompt enhancement,
            safety filtering). Image generation uses the{' '}
            <code className="text-accent">diffusers</code> library with a separate model (SDXL, SD 1.5, etc.).
            Install diffusers and download a model separately.
          </div>
          <Field label="Model Path (HuggingFace ID or local path)">
            <input
              type="text"
              value={merged.image_model || ''}
              onChange={(e) => handleChange('image_model', e.target.value)}
              className={inputClass}
              placeholder="stabilityai/stable-diffusion-xl-base-1.0"
            />
          </Field>
          <Field label="Model Type">
            <select
              value={merged.image_model_type || 'sdxl'}
              onChange={(e) => handleChange('image_model_type', e.target.value)}
              className={inputClass}
            >
              <option value="sdxl">SDXL</option>
              <option value="sd15">SD 1.5</option>
              <option value="sd21">SD 2.1</option>
            </select>
          </Field>
          <Field label="Device">
            <select
              value={merged.device || 'auto'}
              onChange={(e) => handleChange('device', e.target.value)}
              className={inputClass}
            >
              <option value="auto">Auto (CUDA if available, else CPU)</option>
              <option value="cuda">CUDA (NVIDIA GPU)</option>
              <option value="cpu">CPU (slow)</option>
            </select>
          </Field>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={testingModel ? <LoadingSpinner size="xs" /> : <RefreshCw size={13} />}
              onClick={handleTestModel}
              disabled={testingModel || !merged.image_model}
            >
              Test Model
            </Button>
            {modelTestResult && (
              <div className="flex items-center gap-1.5 text-xs">
                {modelTestResult.loaded ? (
                  <CheckCircle size={13} className="text-success" />
                ) : (
                  <XCircle size={13} className="text-error" />
                )}
                <span className={modelTestResult.loaded ? 'text-success' : 'text-error'}>
                  {modelTestResult.message}
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* Safety */}
        <Section title="Copyright Safety" icon={<Shield size={16} />}>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-text/80">Enable safety filter</span>
            <Toggle
              checked={merged.safety_filter_enabled ?? true}
              onChange={(v) => handleChange('safety_filter_enabled', v)}
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-text/80">Auto-enhance prompts with Ollama</span>
            <Toggle
              checked={merged.auto_enhance_prompts ?? true}
              onChange={(v) => handleChange('auto_enhance_prompts', v)}
            />
          </label>
          <Field label="Safety Sensitivity">
            <select
              value={merged.safety_sensitivity || 'medium'}
              onChange={(e) => handleChange('safety_sensitivity', e.target.value)}
              className={inputClass}
            >
              <option value="low">Low (fewer warnings)</option>
              <option value="medium">Medium (recommended)</option>
              <option value="high">High (strict)</option>
            </select>
          </Field>
        </Section>

        {/* Defaults */}
        <Section title="Generation Defaults" icon={<Settings size={16} />}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default Product">
              <select
                value={merged.default_product_type || 'tshirt'}
                onChange={(e) => handleChange('default_product_type', e.target.value as ProductType)}
                className={inputClass}
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Default Style">
              <select
                value={merged.default_output_style || 'flat_graphic'}
                onChange={(e) => handleChange('default_output_style', e.target.value as OutputStyle)}
                className={inputClass}
              >
                {OUTPUT_STYLES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Default Width">
              <input
                type="number"
                value={merged.default_width || 1024}
                onChange={(e) => handleChange('default_width', parseInt(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Default Height">
              <input
                type="number"
                value={merged.default_height || 1024}
                onChange={(e) => handleChange('default_height', parseInt(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Default Steps">
              <input
                type="number"
                value={merged.default_steps || 30}
                onChange={(e) => handleChange('default_steps', parseInt(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Guidance Scale">
              <input
                type="number"
                step="0.5"
                value={merged.default_guidance_scale || 7.5}
                onChange={(e) => handleChange('default_guidance_scale', parseFloat(e.target.value))}
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end pb-6">
          <Button variant="primary" onClick={handleSave} loading={updateMutation.isPending} size="lg">
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  )
}

const inputClass =
  'w-full bg-surface2 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary/50 transition-colors'

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
    <div className="flex items-center gap-2 pb-1 border-b border-border">
      {icon && <span className="text-primary">{icon}</span>}
      <h3 className="text-sm font-semibold text-text">{title}</h3>
    </div>
    {children}
  </div>
)

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-text/60 font-medium">{label}</label>
    {children}
  </div>
)

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <div
    onClick={() => onChange(!checked)}
    className={cn(
      'w-10 h-5 rounded-full transition-colors cursor-pointer relative flex-shrink-0',
      checked ? 'bg-primary' : 'bg-border'
    )}
  >
    <div
      className={cn(
        'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
        checked ? 'left-[22px]' : 'left-0.5'
      )}
    />
  </div>
)

export default SettingsPage
