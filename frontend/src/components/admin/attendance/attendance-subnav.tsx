import { NavLink } from 'react-router-dom'

import { useAuth } from '@/hooks/use-auth'
import { pillSubnavItemClass, pillSubnavNavClass } from '@/lib/pill-subnav'

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
    <nav className={pillSubnavNavClass} aria-label="Bagian presensi">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => pillSubnavItemClass(isActive)}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
