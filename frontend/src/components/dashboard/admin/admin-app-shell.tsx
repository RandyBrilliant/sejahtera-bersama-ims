import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import { AdminHeader } from '@/components/dashboard/admin/admin-header'
import { AdminSidebar } from '@/components/dashboard/admin/admin-sidebar'
import { cn } from '@/lib/utils'

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

export function AdminAppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed])

  return (
    <div className="bg-surface-app text-on-background flex h-screen overflow-hidden">
      <AdminSidebar
        className="hidden h-full md:flex"
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Tutup menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ease-out',
          mobileNavOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
        )}
      >
        <AdminSidebar
          className="shadow-xl"
          forceExpanded
          onNavigate={() => setMobileNavOpen(false)}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AdminHeader onMenuClick={() => setMobileNavOpen(true)} />
        <main className="bg-surface-app flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="page-enter mx-auto max-w-[1440px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
