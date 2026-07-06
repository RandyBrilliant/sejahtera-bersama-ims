import { NavLink } from 'react-router-dom'

import { pillSubnavItemClass, pillSubnavNavClass } from '@/lib/pill-subnav'

const tabs: { to: string; label: string; end?: boolean }[] = [
  { to: '/admin/gudang', label: 'Ringkasan', end: true },
  { to: '/admin/gudang/bahan-baku', label: 'Bahan baku' },
  { to: '/admin/gudang/stok-bahan', label: 'Stok bahan' },
  { to: '/admin/gudang/mutasi-bahan', label: 'Mutasi bahan' },
  { to: '/admin/gudang/mutasi-produk', label: 'Mutasi produk' },
]

export function WarehouseSubnav() {
  return (
    <nav className={pillSubnavNavClass} aria-label="Bagian gudang">
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
