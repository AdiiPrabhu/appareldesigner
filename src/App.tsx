import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/components/Dashboard/Dashboard'
import DesignWorkspace from '@/components/DesignWorkspace/DesignWorkspace'
import Gallery from '@/components/Gallery/Gallery'
import MockupPreview from '@/components/Mockup/MockupPreview'
import DatasetManager from '@/components/References/DatasetManager'
import PresetsPanel from '@/components/Presets/PresetsPanel'
import SettingsPage from '@/components/Settings/SettingsPage'
import { useAppStore } from '@/store/useAppStore'
import { healthApi } from '@/api/client'
import NotificationToasts from '@/components/common/NotificationToasts'

function App() {
  const { setBackendConnected, setOllamaConnected, addNotification } = useAppStore()

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
    refetchInterval: 10_000,
    retry: false,
  })

  useEffect(() => {
    if (health) {
      setBackendConnected(health.status === 'ok')
      setOllamaConnected(health.ollama_connected)
    }
  }, [health, setBackendConnected, setOllamaConnected])

  // Listen for Electron backend events
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onBackendReady(() => {
        setBackendConnected(true)
        addNotification({ type: 'success', title: 'Backend Ready', message: 'AI generation service is running.' })
      })
      window.electronAPI.onBackendError((error) => {
        setBackendConnected(false)
        addNotification({ type: 'error', title: 'Backend Error', message: error, duration: 0 })
      })
      return () => {
        window.electronAPI.removeAllListeners('backend-ready')
        window.electronAPI.removeAllListeners('backend-error')
      }
    }
  }, [setBackendConnected, addNotification])

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="workspace/:projectId?" element={<DesignWorkspace />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="mockup/:imageId?" element={<MockupPreview />} />
          <Route path="references" element={<DatasetManager />} />
          <Route path="presets" element={<PresetsPanel fullPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <NotificationToasts />
    </>
  )
}

export default App
