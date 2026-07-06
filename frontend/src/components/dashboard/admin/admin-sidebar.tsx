import { useState } from 'react'

import {
  Banknote,
  BarChart3,
  Contact,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Package,
  QrCode,
  Settings,
  ShoppingCart,
  Truck,
  User,
  Users,
  Wallet,
  Warehouse,
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
  { to: '/admin/dashboard', label: 'Dasbor', icon: LayoutDashboard, end: true },
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

const warehouseNavItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dasbor gudang', icon: LayoutDashboard, end: true },
  { to: '/admin/gudang/bahan-baku', label: 'Bahan baku', icon: Warehouse },
  { to: '/admin/gudang/stok-bahan', label: 'Stok bahan', icon: Package },
  { to: '/admin/gudang/mutasi-bahan', label: 'Mutasi bahan', icon: ShoppingCart },
  { to: '/admin/gudang/mutasi-produk', label: 'Mutasi produk', icon: BarChart3 },
]

const salesNavItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dasbor penjualan', icon: LayoutDashboard, end: true },
  { to: '/admin/inventaris', label: 'Inventaris (lihat)', icon: Package },
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

type AdminSidebarProps = {
  className?: string
  onNavigate?: () => void
}

const sidebarNavLinkClass = (isActive: boolean) =>
  cn(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    'focus-visible:font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-outline-variant/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest',
    isActive
      ? 'bg-surface-container-low font-semibold text-on-surface'
      : 'text-on-surface-variant hover:bg-surface-container-low/60 hover:text-on-surface'
  )

export function AdminSidebar({ className, onNavigate }: AdminSidebarProps) {
  const { user } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const isWarehouseStaff = user?.role === 'WAREHOUSE_STAFF'
  const isSalesStaff = user?.role === 'SALES_STAFF'
  const isFinanceStaff = user?.role === 'FINANCE_STAFF'
  const visibleNavItems = isWarehouseStaff
    ? warehouseNavItems
    : isSalesStaff
      ? salesNavItems
      : isFinanceStaff
        ? financeNavItems
        : navItems

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
          <div className="font-heading text-lg font-semibold tracking-tight">{APP_BRAND_NAME}</div>
          <div className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
            IMS v1.0.0
          </div>
        </div>
      </div>

      <div className="mt-1 flex flex-1 flex-col gap-1 overflow-y-auto px-4">
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => sidebarNavLinkClass(isActive)}
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
          {!isWarehouseStaff && !isSalesStaff && !isFinanceStaff ? (
            <NavLink
              to="/admin/pengaturan"
              onClick={onNavigate}
              className={({ isActive }) => sidebarNavLinkClass(isActive)}
            >
              <Settings className="size-5" />
              <span>Pengaturan</span>
            </NavLink>
          ) : null}
          <NavLink
            to="/admin/profil"
            onClick={onNavigate}
            className={({ isActive }) => sidebarNavLinkClass(isActive)}
          >
            <User className="size-5" />
            <span>Profil</span>
          </NavLink>
          <button
            type="button"
            className={cn(
              sidebarNavLinkClass(false),
              'w-full text-left'
            )}
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
