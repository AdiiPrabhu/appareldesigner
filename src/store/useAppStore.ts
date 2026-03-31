import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  Project,
  GenerationJob,
  GenerationSettings,
  ReferenceImage,
  AppSettings,
  Notification,
  ProductType,
  OutputStyle,
} from '@/types'

const DEFAULT_SETTINGS: GenerationSettings = {
  product_type: 'tshirt',
  output_style: 'flat_graphic',
  background_mode: 'transparent',
  width: 1024,
  height: 1024,
  steps: 30,
  guidance_scale: 7.5,
  seed: -1,
  num_outputs: 1,
  creativity: 0.7,
  reference_strength: 0.5,
  style_tags: [],
  reference_ids: [],
  enhance_prompt: true,
  safety_check: true,
}

interface AppState {
  // Project state
  currentProject: Project | null
  recentProjectIds: string[]

  // Generation
  activeJob: GenerationJob | null
  jobPollingId: ReturnType<typeof setInterval> | null
  generationSettings: GenerationSettings
  prompt: string
  negativePrompt: string
  promptHistory: string[]
  selectedStyleTags: string[]
  selectedReferenceIds: string[]

  // References panel
  workspaceReferences: ReferenceImage[]
  referencePanelOpen: boolean

  // UI state
  sidebarCollapsed: boolean
  advancedControlsOpen: boolean
  activePage: string
  selectedImageIds: string[]
  mockupImageId: string | null

  // Notifications
  notifications: Notification[]

  // App settings (local cache)
  appSettings: Partial<AppSettings>

  // Backend status
  backendConnected: boolean
  ollamaConnected: boolean

  // Actions
  setCurrentProject: (project: Project | null) => void
  addRecentProject: (projectId: string) => void
  setActiveJob: (job: GenerationJob | null) => void
  updateActiveJob: (update: Partial<GenerationJob>) => void
  setGenerationSettings: (settings: Partial<GenerationSettings>) => void
  setPrompt: (prompt: string) => void
  setNegativePrompt: (prompt: string) => void
  addPromptToHistory: (prompt: string) => void
  setSelectedStyleTags: (tags: string[]) => void
  toggleStyleTag: (tag: string) => void
  setSelectedReferenceIds: (ids: string[]) => void
  toggleReferenceId: (id: string) => void
  setWorkspaceReferences: (refs: ReferenceImage[]) => void
  addWorkspaceReference: (ref: ReferenceImage) => void
  removeWorkspaceReference: (id: string) => void
  clearWorkspaceReferences: () => void
  setReferencePanelOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setAdvancedControlsOpen: (open: boolean) => void
  setActivePage: (page: string) => void
  setSelectedImageIds: (ids: string[]) => void
  toggleSelectedImage: (id: string) => void
  clearSelectedImages: () => void
  setMockupImageId: (id: string | null) => void
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  setAppSettings: (settings: Partial<AppSettings>) => void
  setBackendConnected: (connected: boolean) => void
  setOllamaConnected: (connected: boolean) => void
  resetGenerationSettings: () => void
  loadPreset: (preset: {
    prompt: string
    negative_prompt: string
    style_tags: string[]
    output_style: OutputStyle
    product_type?: ProductType
  }) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentProject: null,
      recentProjectIds: [],
      activeJob: null,
      jobPollingId: null,
      generationSettings: DEFAULT_SETTINGS,
      prompt: '',
      negativePrompt: '',
      promptHistory: [],
      selectedStyleTags: [],
      selectedReferenceIds: [],
      workspaceReferences: [],
      referencePanelOpen: true,
      sidebarCollapsed: false,
      advancedControlsOpen: false,
      activePage: '/',
      selectedImageIds: [],
      mockupImageId: null,
      notifications: [],
      appSettings: {},
      backendConnected: false,
      ollamaConnected: false,

      // Actions
      setCurrentProject: (project) => set({ currentProject: project }),

      addRecentProject: (projectId) => {
        const { recentProjectIds } = get()
        const updated = [projectId, ...recentProjectIds.filter((id) => id !== projectId)].slice(0, 10)
        set({ recentProjectIds: updated })
      },

      setActiveJob: (job) => set({ activeJob: job }),

      updateActiveJob: (update) => {
        const { activeJob } = get()
        if (activeJob) {
          set({ activeJob: { ...activeJob, ...update } })
        }
      },

      setGenerationSettings: (settings) =>
        set((state) => ({
          generationSettings: { ...state.generationSettings, ...settings },
        })),

      setPrompt: (prompt) => set({ prompt }),

      setNegativePrompt: (prompt) => set({ negativePrompt: prompt }),

      addPromptToHistory: (prompt) => {
        if (!prompt.trim()) return
        const { promptHistory } = get()
        const updated = [prompt, ...promptHistory.filter((p) => p !== prompt)].slice(0, 10)
        set({ promptHistory: updated })
      },

      setSelectedStyleTags: (tags) => {
        set({ selectedStyleTags: tags })
        set((state) => ({
          generationSettings: { ...state.generationSettings, style_tags: tags },
        }))
      },

      toggleStyleTag: (tag) => {
        const { selectedStyleTags } = get()
        const updated = selectedStyleTags.includes(tag)
          ? selectedStyleTags.filter((t) => t !== tag)
          : [...selectedStyleTags, tag]
        get().setSelectedStyleTags(updated)
      },

      setSelectedReferenceIds: (ids) => {
        set({ selectedReferenceIds: ids })
        set((state) => ({
          generationSettings: { ...state.generationSettings, reference_ids: ids },
        }))
      },

      toggleReferenceId: (id) => {
        const { selectedReferenceIds } = get()
        const updated = selectedReferenceIds.includes(id)
          ? selectedReferenceIds.filter((i) => i !== id)
          : [...selectedReferenceIds, id]
        get().setSelectedReferenceIds(updated)
      },

      setWorkspaceReferences: (refs) => set({ workspaceReferences: refs }),

      addWorkspaceReference: (ref) =>
        set((state) => ({
          workspaceReferences: [...state.workspaceReferences.filter((r) => r.id !== ref.id), ref],
        })),

      removeWorkspaceReference: (id) =>
        set((state) => ({
          workspaceReferences: state.workspaceReferences.filter((r) => r.id !== id),
        })),

      clearWorkspaceReferences: () => set({ workspaceReferences: [], selectedReferenceIds: [] }),

      setReferencePanelOpen: (open) => set({ referencePanelOpen: open }),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setAdvancedControlsOpen: (open) => set({ advancedControlsOpen: open }),

      setActivePage: (page) => set({ activePage: page }),

      setSelectedImageIds: (ids) => set({ selectedImageIds: ids }),

      toggleSelectedImage: (id) =>
        set((state) => ({
          selectedImageIds: state.selectedImageIds.includes(id)
            ? state.selectedImageIds.filter((i) => i !== id)
            : [...state.selectedImageIds, id],
        })),

      clearSelectedImages: () => set({ selectedImageIds: [] }),

      setMockupImageId: (id) => set({ mockupImageId: id }),

      addNotification: (notification) => {
        const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newNotification: Notification = {
          ...notification,
          id,
          timestamp: Date.now(),
        }
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }))
        const duration = notification.duration ?? 4000
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id)
          }, duration)
        }
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      setAppSettings: (settings) =>
        set((state) => ({ appSettings: { ...state.appSettings, ...settings } })),

      setBackendConnected: (connected) => set({ backendConnected: connected }),

      setOllamaConnected: (connected) => set({ ollamaConnected: connected }),

      resetGenerationSettings: () => set({ generationSettings: DEFAULT_SETTINGS }),

      loadPreset: (preset) => {
        set({
          prompt: preset.prompt,
          negativePrompt: preset.negative_prompt,
          selectedStyleTags: preset.style_tags,
        })
        set((state) => ({
          generationSettings: {
            ...state.generationSettings,
            output_style: preset.output_style,
            product_type: preset.product_type || state.generationSettings.product_type,
            style_tags: preset.style_tags,
          },
        }))
      },
    }),
    {
      name: 'apparel-studio-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        recentProjectIds: state.recentProjectIds,
        sidebarCollapsed: state.sidebarCollapsed,
        generationSettings: state.generationSettings,
        promptHistory: state.promptHistory,
        appSettings: state.appSettings,
      }),
    }
  )
)
