import { NavLink } from 'react-router-dom'

import { pillSubnavItemClass, pillSubnavNavClass } from '@/lib/pill-subnav'

type TabItem = { to: string; label: string; end?: boolean }

const tabs: TabItem[] = [
  { to: '/admin/gaji', label: 'Periode gaji', end: true },
  { to: '/admin/gaji/kompensasi', label: 'Gaji pokok karyawan' },
]

export function PayrollSubnav() {
  return (
    <nav className={pillSubnavNavClass} aria-label="Bagian payroll">
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
