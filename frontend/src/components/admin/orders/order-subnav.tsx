import { NavLink } from 'react-router-dom'

import { pillSubnavItemClass, pillSubnavNavClass } from '@/lib/pill-subnav'

const tabs = [
  { to: '/admin/pesanan/penjualan', label: 'Penjualan' },
  { to: '/admin/pesanan/pembelian', label: 'Pembelian bahan' },
] as const

export function OrderSubnav() {
  return (
    <nav className={pillSubnavNavClass} aria-label="Jenis pesanan">
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
