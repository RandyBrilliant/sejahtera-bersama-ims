import { NavLink } from 'react-router-dom'

import { pillSubnavItemClass, pillSubnavNavClass } from '@/lib/pill-subnav'

type TabItem = { to: string; label: string; end?: boolean }

const tabs: TabItem[] = [
  { to: '/admin/profil', label: 'Akun', end: true },
  { to: '/admin/profil/presensi', label: 'Presensi saya' },
  { to: '/admin/profil/slip-gaji', label: 'Slip gaji saya' },
]

export function ProfileSubnav() {
  return (
    <nav className={pillSubnavNavClass} aria-label="Bagian profil">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end ?? false}
          className={({ isActive }) => pillSubnavItemClass(isActive)}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
