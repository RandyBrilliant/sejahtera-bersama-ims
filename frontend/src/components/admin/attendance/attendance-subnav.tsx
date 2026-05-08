import { NavLink } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const adminTabs = [
  { to: '/admin/absensi/tablet', label: 'Presensi (tablet)' },
  { to: '/admin/absensi/pengaturan', label: 'Aturan presensi' },
  { to: '/admin/absensi/laporan', label: 'Laporan presensi' },
] as const

const financeTabs = [{ to: '/admin/absensi/laporan', label: 'Laporan presensi' }] as const

export function AttendanceSubnav() {
  const { user } = useAuth()
  const tabs = user?.role === 'FINANCE_STAFF' ? financeTabs : adminTabs

  return (
    <nav
      className="border-outline-variant bg-surface-container-lowest flex flex-wrap gap-1 rounded-xl border p-1"
      aria-label="Bagian presensi"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'rounded-lg px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-colors',
              isActive
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
