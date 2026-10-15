import { useState } from 'react'

import {
  ArrowDownToLine,
  Banknote,
  BarChart3,
  Boxes,
  ChevronsUpDown,
  Contact,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Package,
  QrCode,
  Settings,
  ShoppingCart,
  TrendingUp,
  Truck,
  User,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { APP_BRAND_NAME } from '@/constants/brand'
import { USER_ROLE_LABEL } from '@/constants/user-roles'
import { LogoutConfirmModal } from '@/components/auth/logout-confirm-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { initialsFromUser } from '@/lib/user-initials'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean }
type NavSection = { label?: string; items: NavItem[] }

const adminSections: NavSection[] = [
  {
    items: [
      { to: '/admin/dashboard', label: 'Beranda', icon: LayoutDashboard, end: true },
      { to: '/admin/analitik', label: 'Analitik', icon: BarChart3 },
    ],
  },
  {
    label: 'Operasional',
    items: [
      { to: '/admin/pesanan', label: 'Pesanan', icon: ShoppingCart },
      { to: '/admin/gudang', label: 'Gudang', icon: Warehouse },
      { to: '/admin/inventaris', label: 'Inventaris', icon: Package },
      { to: '/admin/pelanggan', label: 'Pelanggan', icon: Contact },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { to: '/admin/kas', label: 'Kas operasional', icon: Wallet },
      { to: '/admin/gaji', label: 'Payroll', icon: CircleDollarSign },
    ],
  },
  {
    label: 'Tim',
    items: [
      { to: '/admin/staf', label: 'Pengguna & staf', icon: Users },
      { to: '/admin/absensi', label: 'Presensi', icon: QrCode },
    ],
  },
]

const ownerNavItem: NavItem = { to: '/admin/hpp', label: 'HPP & laba', icon: TrendingUp }

const warehouseSections: NavSection[] = [
  {
    label: 'Gudang',
    items: [
      { to: '/admin/gudang/stok-bahan', label: 'Stok bahan', icon: Package },
      { to: '/admin/gudang/produksi', label: 'Produksi', icon: Boxes },
      { to: '/admin/gudang/mutasi-bahan', label: 'Penerimaan bahan', icon: ArrowDownToLine },
      { to: '/admin/gudang/mutasi-produk', label: 'Mutasi produk', icon: BarChart3 },
    ],
  },
  {
    label: 'Pesanan',
    items: [{ to: '/admin/pesanan/penjualan', label: 'Penjualan', icon: ShoppingCart }],
  },
]

const salesSections: NavSection[] = [
  {
    items: [
      { to: '/admin/dashboard', label: 'Dasbor penjualan', icon: LayoutDashboard, end: true },
      { to: '/admin/pelanggan', label: 'Pelanggan', icon: Contact },
      { to: '/admin/pesanan/penjualan', label: 'Pesanan penjualan', icon: ShoppingCart },
    ],
  },
]

const financeSections: NavSection[] = [
  {
    items: [
      { to: '/admin/dashboard', label: 'Dasbor keuangan', icon: LayoutDashboard, end: true },
      { to: '/admin/analitik', label: 'Analitik', icon: BarChart3 },
    ],
  },
  {
    label: 'Keuangan',
    items: [
      { to: '/admin/kas', label: 'Kas operasional', icon: Wallet },
      { to: '/admin/gaji', label: 'Payroll', icon: Banknote },
      { to: '/admin/absensi', label: 'Presensi', icon: QrCode },
    ],
  },
  {
    label: 'Pesanan',
    items: [
      { to: '/admin/pelanggan', label: 'Pelanggan', icon: Contact },
      { to: '/admin/pesanan/penjualan', label: 'Pesanan penjualan', icon: ShoppingCart },
      { to: '/admin/pesanan/pembelian', label: 'Pesanan pembelian', icon: Truck },
    ],
  },
]

type AdminSidebarProps = {
  className?: string
  onNavigate?: () => void
  collapsed?: boolean
  /** When true, always render expanded (mobile drawer). */
  forceExpanded?: boolean
}

function navLinkClass(isActive: boolean, collapsed: boolean) {
  return cn(
    'group relative flex h-9 items-center gap-3 rounded-lg text-[13px] font-medium outline-none',
    'transition-[background-color,color,box-shadow] duration-150',
    'focus-visible:ring-2 focus-visible:ring-primary/30',
    collapsed ? 'mx-auto w-10 justify-center' : 'px-2.5',
    isActive
      ? 'bg-white text-primary shadow-[0_1px_2px_rgb(15_23_42/0.06),0_0_0_1px_rgb(15_23_42/0.04)]'
      : 'text-slate-600 hover:bg-slate-900/[0.04] hover:text-slate-900'
  )
}

export function AdminSidebar({
  className,
  onNavigate,
  collapsed: collapsedProp,
  forceExpanded = false,
}: AdminSidebarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const collapsed = !forceExpanded && Boolean(collapsedProp)

  const role = user?.role
  const sections: NavSection[] =
    role === 'WAREHOUSE_STAFF'
      ? warehouseSections
      : role === 'SALES_STAFF'
        ? salesSections
        : role === 'FINANCE_STAFF'
          ? financeSections
          : role === 'LEADERSHIP'
            ? adminSections.map((s, i) => (i === 0 ? { ...s, items: [...s.items, ownerNavItem] } : s))
            : adminSections

  const canOpenSettings = role === 'ADMIN' || role === 'LEADERSHIP'
  const displayName = user?.full_name?.trim() || user?.username || 'Pengguna'
  const initials = user ? initialsFromUser(user.full_name, user.username) : '?'
  const roleLabel = role ? USER_ROLE_LABEL[role] : ''

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={cn(
          'admin-sidebar flex h-full shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]',
          'border-r border-[var(--sidebar-border)]/70',
          'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          collapsed ? 'w-[4.25rem]' : 'w-[15.5rem]',
          className
        )}
      >
        {/* Brand */}
        <div className={cn('flex h-16 shrink-0 items-center gap-2.5', collapsed ? 'justify-center px-2' : 'px-4')}>
          <span className="bg-primary text-primary-foreground grid size-8 shrink-0 place-items-center rounded-[9px] text-[12px] font-bold tracking-tight">
            SB
          </span>
          <div className={cn('min-w-0 flex-1', collapsed && 'sr-only')}>
            <p className="truncate text-[13.5px] leading-tight font-semibold tracking-tight">{APP_BRAND_NAME}</p>
            <p className="text-[11px] leading-tight text-slate-500">Sistem inventaris</p>
          </div>
        </div>

        {/* Navigation */}
        <div className={cn('sidebar-scroll flex-1 overflow-x-hidden overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}>
          {sections.map((section, si) => (
            <div key={section.label ?? `s-${si}`} className={cn(si > 0 && 'mt-5')}>
              {section.label ? (
                collapsed ? (
                  <div className="mx-auto mb-2 h-px w-6 bg-slate-300/70" aria-hidden />
                ) : (
                  <p className="mb-1.5 px-2.5 text-[11px] font-medium text-slate-400">{section.label}</p>
                )
              ) : null}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={({ isActive }) => navLinkClass(isActive, collapsed)}
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={cn(
                                'size-[18px] shrink-0 transition-colors',
                                isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'
                              )}
                              strokeWidth={isActive ? 2.2 : 1.9}
                            />
                            {!collapsed ? <span className="truncate">{item.label}</span> : null}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Account */}
        <div className={cn('shrink-0 border-t border-[var(--sidebar-border)]/70 p-3', collapsed && 'px-2')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg text-left transition-colors outline-none',
                  'hover:bg-slate-900/[0.04] focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=open]:bg-slate-900/[0.05]',
                  collapsed ? 'justify-center p-1' : 'p-1.5'
                )}
                aria-label={`Menu akun: ${displayName}`}
              >
                <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold">
                  {initials}
                </span>
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] leading-tight font-semibold text-slate-900">
                        {displayName}
                      </span>
                      <span className="block truncate text-[11px] leading-tight text-slate-500">{roleLabel}</span>
                    </span>
                    <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
                  </>
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? 'right' : 'top'}
              align={collapsed ? 'end' : 'start'}
              sideOffset={8}
              className="border-outline-variant bg-surface-container-lowest text-on-surface w-56 rounded-xl border p-1 shadow-lg"
            >
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-sm font-semibold">{displayName}</span>
                {user?.username ? (
                  <span className="text-on-surface-variant block truncate text-xs">@{user.username}</span>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-outline-variant" />
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onSelect={() => {
                  onNavigate?.()
                  navigate('/admin/profil')
                }}
              >
                <User className="size-4" />
                Profil
              </DropdownMenuItem>
              {canOpenSettings ? (
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  onSelect={() => {
                    onNavigate?.()
                    navigate('/admin/pengaturan')
                  }}
                >
                  <Settings className="size-4" />
                  Pengaturan
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator className="bg-outline-variant" />
              <DropdownMenuItem variant="destructive" className="cursor-pointer gap-2" onSelect={() => setLogoutOpen(true)}>
                <LogOut className="size-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  )
}
