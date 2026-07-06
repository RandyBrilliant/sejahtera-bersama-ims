import { NavLink } from 'react-router-dom'

import { pillSubnavItemClass, pillSubnavNavClass } from '@/lib/pill-subnav'

const links = [
  { to: '/admin/kas/entri', label: 'Transaksi', end: false },
  { to: '/admin/kas/kategori', label: 'Kategori', end: false },
] as const

export function KasSubnav() {
  return (
    <nav className={pillSubnavNavClass} aria-label="Bagian kas">
      {links.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => pillSubnavItemClass(isActive)}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
