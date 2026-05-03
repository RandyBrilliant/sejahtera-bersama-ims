import {
  ArrowLeftRight,
  BarChart3,
  Box,
  PackagePlus,
  Receipt,
  Truck,
  UserPlus,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type AdminQuickActionItem = {
  id: string
  label: string
  description: string
  to: string
  icon: LucideIcon
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
  },
  {
    id: 'purchase-order-new',
    label: 'Order pembelian',
    description: 'Buat PO masuk',
    to: '/admin/pesanan/pembelian/baru',
    icon: Truck,
  },
  {
    id: 'cash-entry-new',
    label: 'Entri kas',
    description: 'Pemasukan / pengeluaran',
    to: '/admin/kas/entri/baru',
    icon: Wallet,
  },
  {
    id: 'customer-new',
    label: 'Pelanggan baru',
    description: 'Master pelanggan',
    to: '/admin/pelanggan/baru',
    icon: UserPlus,
  },
  {
    id: 'product-new',
    label: 'Produk baru',
    description: 'SKU / kemasan',
    to: '/admin/inventaris/baru',
    icon: PackagePlus,
  },
  {
    id: 'product-movement-new',
    label: 'Mutasi produk',
    description: 'Stok jadi',
    to: '/admin/gudang/mutasi-produk/baru',
    icon: ArrowLeftRight,
  },
  {
    id: 'ingredient-movement-new',
    label: 'Mutasi bahan',
    description: 'Stok bahan baku',
    to: '/admin/gudang/mutasi-bahan/baru',
    icon: Box,
  },
  {
    id: 'analytics',
    label: 'Analitik',
    description: 'Laporan & rentang tanggal',
    to: '/admin/analitik',
    icon: BarChart3,
  },
]
