import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

type TabItem = { to: string; label: string; end?: boolean }

const tabs: TabItem[] = [
  { to: '/admin/profil', label: 'Akun', end: true },
  { to: '/admin/profil/presensi', label: 'Presensi saya' },
  { to: '/admin/profil/slip-gaji', label: 'Slip gaji saya' },
]

export function ProfileSubnav() {
  return (
    <nav
      className="border-outline-variant bg-surface-container-lowest flex flex-wrap gap-1 rounded-xl border p-1"
      aria-label="Bagian profil"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end ?? false}
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
