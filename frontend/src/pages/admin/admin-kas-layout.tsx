import { Outlet } from 'react-router-dom'

import { KasSubnav } from '@/components/admin/kas/kas-subnav'

export function AdminKasLayout() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Kas operasional
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Jurnal pemasukan dan pengeluaran kas harian. Kategori mengelompokkan transaksi; laporan
          ringkas tetap tersedia dari dasbor dan endpoint laporan.
        </p>
      </div>

      <KasSubnav />

      <Outlet />
    </div>
  )
}
