import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useAppStore } from '@/store/useAppStore'

const Layout: React.FC = () => {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-text">
      <Sidebar />
      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-200"
        style={{ marginLeft: sidebarCollapsed ? 60 : 240 }}
      >
        <TopBar />
        <main className="flex-1 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default Layout
