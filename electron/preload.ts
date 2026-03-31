import { contextBridge, ipcRenderer } from 'electron'

export interface FileDialogOptions {
  filters?: Array<{ name: string; extensions: string[] }>
  multiSelect?: boolean
  defaultPath?: string
}

export interface ElectronAPI {
  openFileDialog: (options?: FileDialogOptions) => Promise<Electron.OpenDialogReturnValue>
  saveFileDialog: (options?: FileDialogOptions) => Promise<Electron.SaveDialogReturnValue>
  openFolderDialog: () => Promise<Electron.OpenDialogReturnValue>
  getAppPath: (name: string) => Promise<string>
  getBackendStatus: () => Promise<{ ready: boolean; port: number }>
  platform: string
  onBackendReady: (callback: () => void) => void
  onBackendError: (callback: (error: string) => void) => void
  removeAllListeners: (channel: string) => void
}

const electronAPI: ElectronAPI = {
  openFileDialog: (options?: FileDialogOptions) =>
    ipcRenderer.invoke('open-file-dialog', options),

  saveFileDialog: (options?: FileDialogOptions) =>
    ipcRenderer.invoke('save-file-dialog', options),

  openFolderDialog: () =>
    ipcRenderer.invoke('open-folder-dialog'),

  getAppPath: (name: string) =>
    ipcRenderer.invoke('get-app-path', name),

  getBackendStatus: () =>
    ipcRenderer.invoke('backend-status'),

  platform: process.platform,

  onBackendReady: (callback: () => void) => {
    ipcRenderer.on('backend-ready', () => callback())
  },

  onBackendError: (callback: (error: string) => void) => {
    ipcRenderer.on('backend-error', (_event, error: string) => callback(error))
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Declare types for window
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
