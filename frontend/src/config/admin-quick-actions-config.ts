import {
  ArrowLeftRight,
  BarChart3,
  Box,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Coins,
  PackagePlus,
  Receipt,
  ScrollText,
  Timer,
  Truck,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/types/auth'

export type AdminQuickActionItem = {
  id: string
  label: string
  description: string
  to: string
  icon: LucideIcon
  allowedRoles: readonly UserRole[]
}

/**
 * Aksi cepat untuk operasional harian (IMS): transaksi, master data, laporan.
 * Satu sumber kebenaran untuk header, sidebar, dan halaman pengaturan.
 */
export const ADMIN_QUICK_ACTIONS: AdminQuickActionItem[] = [
  {
    id: 'sales-order-new',
    label: 'Order penjualan',
    description: 'Buat SO baru',
    to: '/admin/pesanan/penjualan/baru',
    icon: Receipt,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'SALES_STAFF'],
  },
  {
    id: 'purchase-order-new',
    label: 'Order pembelian',
    description: 'Buat PO masuk',
    to: '/admin/pesanan/pembelian/baru',
    icon: Truck,
    allowedRoles: ['ADMIN', 'LEADERSHIP'],
  },
  {
    id: 'purchase-order-list',
    label: 'Daftar pembelian',
    description: 'Lihat order pembelian',
    to: '/admin/pesanan/pembelian',
    icon: Truck,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'WAREHOUSE_STAFF', 'FINANCE_STAFF'],
  },
  {
    id: 'cash-entry-new',
    label: 'Entri kas',
    description: 'Pemasukan / pengeluaran',
    to: '/admin/kas/entri/baru',
    icon: Wallet,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'FINANCE_STAFF'],
  },
  {
    id: 'customer-new',
    label: 'Pelanggan baru',
    description: 'Master pelanggan',
    to: '/admin/pelanggan/baru',
    icon: UserPlus,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'SALES_STAFF'],
  },
  {
    id: 'product-new',
    label: 'Produk baru',
    description: 'SKU / kemasan',
    to: '/admin/inventaris/baru',
    icon: PackagePlus,
    allowedRoles: ['ADMIN', 'LEADERSHIP'],
  },
  {
    id: 'product-movement-new',
    label: 'Mutasi produk',
    description: 'Stok jadi',
    to: '/admin/gudang/mutasi-produk/baru',
    icon: ArrowLeftRight,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'WAREHOUSE_STAFF'],
  },
  {
    id: 'ingredient-movement-new',
    label: 'Mutasi bahan',
    description: 'Stok bahan baku',
    to: '/admin/gudang/mutasi-bahan/baru',
    icon: Box,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'WAREHOUSE_STAFF'],
  },
  {
    id: 'analytics',
    label: 'Analitik',
    description: 'Laporan & rentang tanggal',
    to: '/admin/analitik',
    icon: BarChart3,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'FINANCE_STAFF'],
  },
  {
    id: 'attendance-settings',
    label: 'Aturan presensi',
    description: 'Jam kerja & toleransi telat',
    to: '/admin/absensi/pengaturan',
    icon: Timer,
    allowedRoles: ['ADMIN', 'LEADERSHIP'],
  },
  {
    id: 'attendance-report',
    label: 'Laporan presensi',
    description: 'Check-in/out per pegawai',
    to: '/admin/absensi/laporan',
    icon: ClipboardList,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'FINANCE_STAFF'],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    description: 'Periode slip gaji pegawai',
    to: '/admin/gaji',
    icon: CircleDollarSign,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'FINANCE_STAFF'],
  },
  {
    id: 'payroll-compensation',
    label: 'Gaji pokok pegawai',
    description: 'Nominasi bulanan untuk semua staf aktif',
    to: '/admin/gaji/kompensasi',
    icon: Coins,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'FINANCE_STAFF'],
  },
  {
    id: 'my-attendance',
    label: 'Presensi saya',
    description: 'Riwayat hadir Anda',
    to: '/admin/profil/presensi',
    icon: Clock,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'WAREHOUSE_STAFF', 'SALES_STAFF', 'FINANCE_STAFF'],
  },
  {
    id: 'my-payroll-slip',
    label: 'Slip gaji saya',
    description: 'Periode sudah dikunci',
    to: '/admin/profil/slip-gaji',
    icon: ScrollText,
    allowedRoles: ['ADMIN', 'LEADERSHIP', 'WAREHOUSE_STAFF', 'SALES_STAFF', 'FINANCE_STAFF'],
  },
]

export function quickActionsForRole(role: UserRole): AdminQuickActionItem[] {
  return ADMIN_QUICK_ACTIONS.filter((item) => item.allowedRoles.includes(role))
}
