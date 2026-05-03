import { Outlet } from 'react-router-dom'

import { OrderSubnav } from '@/components/admin/orders/order-subnav'

export function AdminOrdersLayout() {
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

      <OrderSubnav />

      <Outlet />
    </div>
  )
}
