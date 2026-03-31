export type ProductType = 'tshirt' | 'hoodie' | 'jacket' | 'sweatshirt' | 'cap' | 'custom'
export type OutputStyle =
  | 'flat_graphic'
  | 'streetwear'
  | 'embroidery'
  | 'minimal_vector'
  | 'vintage_distressed'
  | 'futuristic'
  | 'anime_inspired'
  | 'abstract'
  | 'custom'
export type BackgroundMode = 'transparent' | 'white' | 'solid_color'
export type ReferenceType = 'inspiration' | 'composition' | 'color_palette' | 'texture' | 'style'
export type GenerationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Project {
  id: string
  name: string
  product_type: ProductType
  description?: string
  created_at: string
  updated_at: string
  image_count: number
  thumbnail_url?: string
}

export interface GeneratedImage {
  id: string
  project_id: string
  prompt: string
  negative_prompt: string
  seed: number
  width: number
  height: number
  steps: number
  guidance_scale: number
  output_style: OutputStyle
  product_type: ProductType
  file_path: string
  thumbnail_path: string
  is_favorite: boolean
  created_at: string
  metadata: Record<string, unknown>
  references_used: string[]
}

export interface PromptPreset {
  id: string
  name: string
  prompt: string
  negative_prompt: string
  style_tags: string[]
  output_style: OutputStyle
  product_type?: ProductType
  is_builtin: boolean
  created_at: string
}

export interface ReferenceImage {
  id: string
  collection_id: string
  file_path: string
  thumbnail_path: string
  filename: string
  reference_type: ReferenceType
  weight: number
  tags: string[]
  created_at: string
}

export interface ReferenceCollection {
  id: string
  name: string
  description?: string
  tags: string[]
  image_count: number
  created_at: string
}

export interface GenerationJob {
  id: string
  project_id: string
  status: GenerationStatus
  prompt: string
  enhanced_prompt?: string
  negative_prompt: string
  settings: GenerationSettings
  progress: number
  error?: string
  created_at: string
  completed_at?: string
  result_image_ids: string[]
}

export interface GenerationSettings {
  product_type: ProductType
  output_style: OutputStyle
  background_mode: BackgroundMode
  width: number
  height: number
  steps: number
  guidance_scale: number
  seed: number
  num_outputs: number
  creativity: number
  reference_strength: number
  solid_color?: string
  style_tags?: string[]
  reference_ids?: string[]
  enhance_prompt?: boolean
  safety_check?: boolean
}

export interface SafetyCheckResult {
  is_safe: boolean
  risk_level: 'none' | 'low' | 'medium' | 'high'
  warnings: string[]
  suggested_prompt?: string
  blocked_terms: string[]
}

export interface EnhancedPromptResult {
  original_prompt: string
  enhanced_prompt: string
  negative_prompt: string
  style_notes: string[]
}

export interface AppSettings {
  backend_port: number
  ollama_host: string
  ollama_model: string
  image_model: string
  image_model_type: string
  storage_path: string
  auto_enhance_prompts: boolean
  safety_filter_enabled: boolean
  safety_sensitivity: 'low' | 'medium' | 'high'
  default_product_type: ProductType
  default_output_style: OutputStyle
  default_width: number
  default_height: number
  default_steps: number
  default_guidance_scale: number
  device: string
}

export interface MockupPlacement {
  x: number
  y: number
  scale: number
  rotation: number
  garment_color: string
  garment_type: ProductType
  placement_zone: 'front' | 'back' | 'left_chest' | 'right_chest'
}

export interface ExportRequest {
  format: 'png' | 'transparent_png' | 'jpg' | 'print_ready'
  quality?: number
  dpi?: number
  output_path?: string
}

export interface HealthStatus {
  status: 'ok' | 'error'
  ollama_connected: boolean
  image_model_loaded: boolean
  ollama_model?: string
  version?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface GalleryFilters {
  project_id?: string
  product_type?: ProductType
  output_style?: OutputStyle
  favorites_only?: boolean
  search?: string
  sort?: 'newest' | 'oldest' | 'favorites'
  page?: number
  page_size?: number
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  timestamp: number
}

export interface DesignConceptSuggestion {
  title: string
  prompt: string
  style_tags: string[]
  output_style: OutputStyle
}

export interface OllamaModel {
  name: string
  size: number
  modified_at: string
  digest: string
}
