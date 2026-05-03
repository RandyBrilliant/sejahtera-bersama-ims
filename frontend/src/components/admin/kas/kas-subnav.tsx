import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

const links = [
  { to: '/admin/kas/entri', label: 'Transaksi', end: false },
  { to: '/admin/kas/kategori', label: 'Kategori', end: false },
] as const

export function KasSubnav() {
  return (
    <div className="border-outline-variant flex flex-wrap gap-2 border-b pb-3">
      {links.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-on-surface-variant hover:bg-surface-container-low bg-surface-container-lowest'
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
