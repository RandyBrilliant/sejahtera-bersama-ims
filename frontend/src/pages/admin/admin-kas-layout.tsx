import { Outlet } from 'react-router-dom'

import { KasSubnav } from '@/components/admin/kas/kas-subnav'
import { OperationalCashSaldoCards } from '@/components/admin/kas/operational-cash-saldo-cards'

export function AdminKasLayout() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Kas operasional
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Jurnal pemasukan dan pengeluaran kas harian. Saldo saat ini dihitung dari seluruh entri
          (pemasukan dikurangi pengeluaran), dipisah tunai dan transfer.
        </p>
      </div>

      <OperationalCashSaldoCards />

      <KasSubnav />

      <Outlet />
    </div>
  )
}
