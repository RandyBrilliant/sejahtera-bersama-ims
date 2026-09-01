import { useEffect, useState } from 'react'

import {
  Banknote,
  BarChart3,
  Boxes,
  Contact,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  User,
  Users,
  Wallet,
  Warehouse,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { APP_BRAND_NAME } from '@/constants/brand'
import { LogoutConfirmModal } from '@/components/auth/logout-confirm-modal'
import { AdminQuickActionsDropdown } from '@/components/dashboard/admin/admin-quick-actions'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }

const navItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Beranda', icon: LayoutDashboard, end: true },
  { to: '/admin/staf', label: 'Pengguna & staf', icon: Users },
  { to: '/admin/inventaris', label: 'Inventaris', icon: Package },
  { to: '/admin/pelanggan', label: 'Pelanggan', icon: Contact },
  { to: '/admin/kas', label: 'Kas operasional', icon: Wallet },
  { to: '/admin/pesanan', label: 'Pesanan', icon: ShoppingCart },
  { to: '/admin/gudang', label: 'Gudang', icon: Warehouse },
  { to: '/admin/analitik', label: 'Analitik', icon: BarChart3 },
  { to: '/admin/absensi', label: 'Presensi', icon: QrCode },
  { to: '/admin/gaji', label: 'Payroll', icon: CircleDollarSign },
]

const ownerNavItem: NavItem = { to: '/admin/hpp', label: 'HPP & laba', icon: TrendingUp }

const warehouseNavItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dasbor gudang', icon: LayoutDashboard, end: true },
  { to: '/admin/gudang/stok-bahan', label: 'Stok bahan', icon: Package },
  { to: '/admin/gudang/produksi', label: 'Produksi', icon: Boxes },
  { to: '/admin/pesanan/penjualan', label: 'Penjualan', icon: ShoppingCart },
  { to: '/admin/gudang/mutasi-bahan', label: 'Mutasi bahan', icon: Truck },
  { to: '/admin/gudang/mutasi-produk', label: 'Mutasi produk', icon: BarChart3 },
]

const salesNavItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dasbor penjualan', icon: LayoutDashboard, end: true },
  { to: '/admin/pelanggan', label: 'Pelanggan', icon: Contact },
  { to: '/admin/pesanan/penjualan', label: 'Pesanan penjualan', icon: ShoppingCart },
]

const financeNavItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dasbor keuangan', icon: LayoutDashboard, end: true },
  { to: '/admin/kas', label: 'Kas operasional', icon: Wallet },
  { to: '/admin/analitik', label: 'Analitik', icon: BarChart3 },
  { to: '/admin/absensi', label: 'Presensi', icon: QrCode },
  { to: '/admin/gaji', label: 'Payroll', icon: Banknote },
  { to: '/admin/pelanggan', label: 'Pelanggan', icon: Contact },
  { to: '/admin/pesanan/penjualan', label: 'Pesanan penjualan', icon: ShoppingCart },
  { to: '/admin/pesanan/pembelian', label: 'Pesanan pembelian', icon: Truck },
]

const SIDEBAR_COLLAPSED_KEY = 'admin-sidebar-collapsed'

type AdminSidebarProps = {
  className?: string
  onNavigate?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** When true, hide collapse control (mobile drawer always expanded). */
  forceExpanded?: boolean
}

function sidebarNavLinkClass(isActive: boolean, collapsed: boolean) {
  return cn(
    'group relative flex items-center gap-3 rounded-lg text-sm font-medium outline-none',
    'transition-colors duration-150',
    collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
    'focus-visible:bg-[var(--sidebar-accent)]',
    isActive
      ? 'bg-[var(--sidebar-accent)] font-semibold text-primary'
      : 'text-[var(--sidebar-foreground)]/65 hover:bg-[var(--sidebar-accent)]/80 hover:text-[var(--sidebar-accent-foreground)]'
  )
}

export function AdminSidebar({
  className,
  onNavigate,
  collapsed: collapsedProp,
  onCollapsedChange,
  forceExpanded = false,
}: AdminSidebarProps) {
  const { user } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })

  const collapsed = forceExpanded ? false : (collapsedProp ?? internalCollapsed)

  useEffect(() => {
    if (forceExpanded || collapsedProp != null) return
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed, collapsedProp, forceExpanded])

  function setCollapsed(next: boolean) {
    if (onCollapsedChange) onCollapsedChange(next)
    else setInternalCollapsed(next)
  }

  const isWarehouseStaff = user?.role === 'WAREHOUSE_STAFF'
  const isSalesStaff = user?.role === 'SALES_STAFF'
  const isFinanceStaff = user?.role === 'FINANCE_STAFF'
  const isOwner = user?.role === 'LEADERSHIP'
  const visibleNavItems = isWarehouseStaff
    ? warehouseNavItems
    : isSalesStaff
      ? salesNavItems
      : isFinanceStaff
        ? financeNavItems
        : isOwner
          ? [...navItems, ownerNavItem]
          : navItems

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={cn(
          'admin-sidebar text-[var(--sidebar-foreground)] flex h-full shrink-0 flex-col',
          'border-r border-[var(--sidebar-border)] bg-[var(--sidebar)]',
          'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          collapsed ? 'w-[4.5rem]' : 'w-64',
          className
        )}
      >
        <div
          className={cn(
            'flex items-start gap-2 px-3 pt-5 pb-3',
            collapsed ? 'flex-col items-center' : 'justify-between'
          )}
        >
          <div className={cn('min-w-0', collapsed && 'hidden')}>
            <p className="font-heading text-[var(--sidebar-foreground)] text-[15px] leading-snug font-bold tracking-tight">
              {APP_BRAND_NAME}
            </p>
            <p className="text-[var(--sidebar-foreground)]/45 mt-0.5 text-[10px] font-semibold tracking-[0.14em] uppercase">
              IMS
            </p>
          </div>

          {!forceExpanded ? (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                'text-[var(--sidebar-foreground)]/55 hover:text-[var(--sidebar-foreground)]',
                'hover:bg-[var(--sidebar-accent)] focus-visible:bg-[var(--sidebar-accent)]',
                'inline-flex size-9 shrink-0 items-center justify-center rounded-lg outline-none',
                'transition-colors duration-150'
              )}
              aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
              aria-expanded={!collapsed}
              title={collapsed ? 'Perluas' : 'Ciutkan'}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </button>
          ) : null}
        </div>

        <div className="mx-3 h-px bg-[var(--sidebar-border)]" />

        <div
          className={cn(
            'mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden',
            collapsed ? 'px-2' : 'px-3'
          )}
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) => sidebarNavLinkClass(isActive, collapsed)}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'size-[1.15rem] shrink-0',
                        isActive ? 'text-primary' : 'opacity-80'
                      )}
                    />
                    <span
                      className={cn(
                        'truncate',
                        collapsed && 'sr-only',
                        isActive && 'font-semibold text-primary'
                      )}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>

        <div className={cn('mt-auto pb-4', collapsed ? 'px-2' : 'px-3')}>
          <AdminQuickActionsDropdown
            side="top"
            align="center"
            sideOffset={8}
            onNavigate={onNavigate}
            trigger={
              <button
                type="button"
                title="Aksi cepat"
                className={cn(
                  'bg-primary text-primary-foreground w-full rounded-lg text-[11px] font-semibold tracking-wider uppercase outline-none',
                  'transition-opacity duration-150 hover:opacity-90',
                  'focus-visible:opacity-90',
                  collapsed ? 'px-0 py-2.5' : 'px-3 py-2.5'
                )}
              >
                {collapsed ? (
                  <Zap className="mx-auto size-4" aria-hidden />
                ) : (
                  'Aksi cepat'
                )}
              </button>
            }
          />

          <div className="mt-3 h-px bg-[var(--sidebar-border)]" />

          <div className="mt-3 flex flex-col gap-0.5">
            {!isWarehouseStaff && !isSalesStaff && !isFinanceStaff ? (
              <NavLink
                to="/admin/pengaturan"
                onClick={onNavigate}
                title={collapsed ? 'Pengaturan' : undefined}
                className={({ isActive }) => sidebarNavLinkClass(isActive, collapsed)}
              >
                <Settings className="size-[1.15rem] shrink-0 opacity-80" />
                <span className={cn(collapsed && 'sr-only')}>Pengaturan</span>
              </NavLink>
            ) : null}
            <NavLink
              to="/admin/profil"
              onClick={onNavigate}
              title={collapsed ? 'Profil' : undefined}
              className={({ isActive }) => sidebarNavLinkClass(isActive, collapsed)}
            >
              <User className="size-[1.15rem] shrink-0 opacity-80" />
              <span className={cn(collapsed && 'sr-only')}>Profil</span>
            </NavLink>
            <button
              type="button"
              title={collapsed ? 'Keluar' : undefined}
              className={cn(sidebarNavLinkClass(false, collapsed), 'w-full')}
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut className="size-[1.15rem] shrink-0 opacity-80" />
              <span className={cn(collapsed && 'sr-only')}>Keluar</span>
            </button>
          </div>
        </div>
      </nav>
      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  )
}
