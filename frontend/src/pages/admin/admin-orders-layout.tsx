import { Outlet } from 'react-router-dom'

import { OrderSubnav } from '@/components/admin/orders/order-subnav'
import { useAuth } from '@/hooks/use-auth'

export function AdminOrdersLayout() {
  const { user } = useAuth()
  const showSubnav = user?.role !== 'SALES_STAFF' && user?.role !== 'FINANCE_STAFF'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Pesanan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Order penjualan ke pelanggan dan order pembelian bahan dari supplier. Verifikasi pembayaran &
          stok untuk penjualan hanya dapat dilakukan oleh pemilik (owner).
        </p>
      </div>

      {showSubnav ? <OrderSubnav /> : null}

      <Outlet />
    </div>
  )
}
