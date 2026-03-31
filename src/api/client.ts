import axios, { AxiosInstance } from 'axios'
import type {
  Project,
  GeneratedImage,
  GenerationJob,
  GenerationSettings,
  PromptPreset,
  ReferenceImage,
  ReferenceCollection,
  AppSettings,
  HealthStatus,
  SafetyCheckResult,
  EnhancedPromptResult,
  PaginatedResponse,
  GalleryFilters,
  ExportRequest,
  OllamaModel,
  ReferenceType,
} from '@/types'

const BACKEND_PORT = 8765

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: `http://localhost:${BACKEND_PORT}`,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.error('Backend not available')
      }
      return Promise.reject(error)
    }
  )

  return client
}

export const apiClient = createClient()

// ---- Health ----
export const healthApi = {
  check: async (): Promise<HealthStatus> => {
    const res = await apiClient.get('/health')
    return res.data
  },
}

// ---- Projects ----
export const projectsApi = {
  list: async (page = 1, pageSize = 20): Promise<PaginatedResponse<Project>> => {
    const res = await apiClient.get('/projects', { params: { page, page_size: pageSize } })
    return res.data
  },

  create: async (data: { name: string; product_type: string; description?: string }): Promise<Project> => {
    const res = await apiClient.post('/projects', data)
    return res.data
  },

  get: async (id: string): Promise<Project> => {
    const res = await apiClient.get(`/projects/${id}`)
    return res.data
  },

  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const res = await apiClient.put(`/projects/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`)
  },

  duplicate: async (id: string): Promise<Project> => {
    const res = await apiClient.post(`/projects/${id}/duplicate`)
    return res.data
  },
}

// ---- Generation ----
export const generationApi = {
  start: async (data: {
    project_id: string
    prompt: string
    negative_prompt?: string
    settings: GenerationSettings
  }): Promise<{ job_id: string }> => {
    const res = await apiClient.post('/generation/start', data)
    return res.data
  },

  getJob: async (jobId: string): Promise<GenerationJob> => {
    const res = await apiClient.get(`/generation/job/${jobId}`)
    return res.data
  },

  listJobs: async (limit = 10): Promise<GenerationJob[]> => {
    const res = await apiClient.get('/generation/jobs', { params: { limit } })
    return res.data
  },

  enhancePrompt: async (data: {
    prompt: string
    product_type: string
    style_tags?: string[]
    output_style?: string
  }): Promise<EnhancedPromptResult> => {
    const res = await apiClient.post('/generation/enhance-prompt', data)
    return res.data
  },

  safetyCheck: async (prompt: string): Promise<SafetyCheckResult> => {
    const res = await apiClient.post('/generation/safety-check', { prompt })
    return res.data
  },

  cancelJob: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/generation/job/${jobId}`)
  },
}

// ---- Images / Gallery ----
export const imagesApi = {
  list: async (filters: GalleryFilters): Promise<PaginatedResponse<GeneratedImage>> => {
    const res = await apiClient.get('/images', { params: filters })
    return res.data
  },

  get: async (id: string): Promise<GeneratedImage> => {
    const res = await apiClient.get(`/images/${id}`)
    return res.data
  },

  toggleFavorite: async (id: string): Promise<{ is_favorite: boolean }> => {
    const res = await apiClient.put(`/images/${id}/favorite`)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/images/${id}`)
  },

  getVariations: async (id: string): Promise<GeneratedImage[]> => {
    const res = await apiClient.get(`/images/${id}/variations`)
    return res.data
  },

  remix: async (id: string, settings?: Partial<GenerationSettings>): Promise<{ job_id: string }> => {
    const res = await apiClient.post(`/images/${id}/remix`, settings || {})
    return res.data
  },
}

// ---- References ----
export const referencesApi = {
  listCollections: async (): Promise<ReferenceCollection[]> => {
    const res = await apiClient.get('/references/collections')
    return res.data
  },

  createCollection: async (data: { name: string; description?: string; tags?: string[] }): Promise<ReferenceCollection> => {
    const res = await apiClient.post('/references/collections', data)
    return res.data
  },

  deleteCollection: async (id: string): Promise<void> => {
    await apiClient.delete(`/references/collections/${id}`)
  },

  uploadImages: async (collectionId: string, files: File[], referenceType?: ReferenceType): Promise<ReferenceImage[]> => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    if (referenceType) formData.append('reference_type', referenceType)
    const res = await apiClient.post(`/references/collections/${collectionId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  addFolder: async (collectionId: string, folderPath: string): Promise<ReferenceImage[]> => {
    const res = await apiClient.post(`/references/collections/${collectionId}/folder`, { folder_path: folderPath })
    return res.data
  },

  listImages: async (collectionId: string, page = 1, pageSize = 50): Promise<PaginatedResponse<ReferenceImage>> => {
    const res = await apiClient.get(`/references/collections/${collectionId}/images`, {
      params: { page, page_size: pageSize },
    })
    return res.data
  },

  updateImage: async (
    id: string,
    data: { reference_type?: ReferenceType; weight?: number; tags?: string[] }
  ): Promise<ReferenceImage> => {
    const res = await apiClient.put(`/references/images/${id}`, data)
    return res.data
  },

  deleteImage: async (id: string): Promise<void> => {
    await apiClient.delete(`/references/images/${id}`)
  },
}

// ---- Presets ----
export const presetsApi = {
  list: async (): Promise<PromptPreset[]> => {
    const res = await apiClient.get('/presets')
    return res.data
  },

  create: async (data: Omit<PromptPreset, 'id' | 'is_builtin' | 'created_at'>): Promise<PromptPreset> => {
    const res = await apiClient.post('/presets', data)
    return res.data
  },

  update: async (id: string, data: Partial<PromptPreset>): Promise<PromptPreset> => {
    const res = await apiClient.put(`/presets/${id}`, data)
    return res.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/presets/${id}`)
  },
}

// ---- Export ----
export const exportApi = {
  exportImage: async (id: string, request: ExportRequest): Promise<{ export_path: string }> => {
    const res = await apiClient.post(`/export/image/${id}`, request)
    return res.data
  },

  exportMockup: async (data: {
    image_id: string
    placement: Record<string, unknown>
    garment_type: string
    garment_color: string
  }): Promise<{ export_path: string }> => {
    const res = await apiClient.post('/export/mockup', data)
    return res.data
  },

  exportProjectPackage: async (projectId: string): Promise<{ export_path: string }> => {
    const res = await apiClient.post(`/export/project/${projectId}/package`)
    return res.data
  },

  getHistory: async (): Promise<Array<{ id: string; image_id: string; export_path: string; export_format: string; created_at: string }>> => {
    const res = await apiClient.get('/export/history')
    return res.data
  },
}

// ---- Settings ----
export const settingsApi = {
  get: async (): Promise<AppSettings> => {
    const res = await apiClient.get('/settings')
    return res.data
  },

  update: async (data: Partial<AppSettings>): Promise<AppSettings> => {
    const res = await apiClient.put('/settings', data)
    return res.data
  },

  listModels: async (): Promise<OllamaModel[]> => {
    const res = await apiClient.get('/settings/models')
    return res.data
  },

  testOllama: async (host?: string, model?: string): Promise<{ connected: boolean; message: string }> => {
    const res = await apiClient.post('/settings/test-ollama', { host, model })
    return res.data
  },

  testImageModel: async (modelPath?: string): Promise<{ loaded: boolean; message: string }> => {
    const res = await apiClient.post('/settings/test-image-model', { model_path: modelPath })
    return res.data
  },
}

export const getImageUrl = (filePath: string): string => {
  if (!filePath) return ''
  const normalized = filePath.replace(/\\/g, '/').replace(/^.*\/data\//, 'data/')
  return `http://localhost:${BACKEND_PORT}/static/${normalized}`
}

export const getThumbnailUrl = (thumbnailPath: string): string => {
  return getImageUrl(thumbnailPath)
}
