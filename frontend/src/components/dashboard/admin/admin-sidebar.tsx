import { useState } from 'react'

import {
  BarChart3,
  Contact,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  User,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { LogoutConfirmModal } from '@/components/auth/logout-confirm-modal'
import { AdminQuickActionsDropdown } from '@/components/dashboard/admin/admin-quick-actions'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

const navItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dasbor', icon: LayoutDashboard, end: true },
  { to: '/admin/staf', label: 'Pengguna & staf', icon: Users },
  { to: '/admin/inventaris', label: 'Inventaris', icon: Package },
  { to: '/admin/pelanggan', label: 'Pelanggan', icon: Contact },
  { to: '/admin/kas', label: 'Kas operasional', icon: Wallet },
  { to: '/admin/pesanan', label: 'Pesanan', icon: ShoppingCart },
  { to: '/admin/gudang', label: 'Gudang', icon: Warehouse },
  { to: '/admin/analitik', label: 'Analitik', icon: BarChart3 },
]

type AdminSidebarProps = {
  className?: string
  onNavigate?: () => void
}

export function AdminSidebar({ className, onNavigate }: AdminSidebarProps) {
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <>
    <nav
      className={cn(
        'border-outline-variant bg-surface-container-lowest text-on-surface flex h-full w-64 shrink-0 flex-col gap-2 border-r py-4',
        className
      )}
    >
      <div className="flex items-center gap-2 px-6 py-4">
        <div className="bg-primary-container text-on-primary-container flex size-8 items-center justify-center rounded font-bold">
          S
        </div>
        <div>
          <div className="font-heading text-lg font-semibold tracking-tight">Sejahtera Bersama</div>
          <div className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
            IMS v1.0.0
          </div>
        </div>
      </div>

      <div className="mt-1 flex flex-1 flex-col gap-1 overflow-y-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-lg px-4 py-3 font-semibold transition-all duration-200',
                  isActive
                    ? 'border-primary bg-surface-container-low text-primary border-l-4'
                    : 'text-on-surface-variant hover:bg-surface-container-lowest hover:text-on-surface hover:pl-5 border-l-4 border-transparent'
                )
              }
            >
              <Icon className="size-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>

      <div className="mt-auto px-4 py-4">
        <AdminQuickActionsDropdown
          side="top"
          align="center"
          sideOffset={8}
          onNavigate={onNavigate}
          trigger={
            <button
              type="button"
              className="ambient-shadow bg-primary text-primary-foreground hover:opacity-90 w-full rounded-lg py-2 text-[11px] font-semibold tracking-wider uppercase transition-opacity"
            >
              Aksi cepat
            </button>
          }
        />
        <div className="border-outline-variant mt-4 flex flex-col gap-1 border-t pt-4">
          <NavLink
            to="/admin/pengaturan"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'text-on-surface-variant hover:bg-surface-container-lowest flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
                isActive && 'bg-surface-container-low text-on-surface'
              )
            }
          >
            <Settings className="size-5" />
            <span>Pengaturan</span>
          </NavLink>
          <NavLink
            to="/admin/profil"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'text-on-surface-variant hover:bg-surface-container-lowest flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
                isActive && 'bg-surface-container-low text-on-surface'
              )
            }
          >
            <User className="size-5" />
            <span>Profil</span>
          </NavLink>
          <button
            type="button"
            className="text-on-surface-variant hover:bg-surface-container-lowest flex items-center gap-2 rounded-lg px-4 py-2 transition-colors"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="size-5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </nav>
    <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  )
}
