import { Outlet, useLocation } from 'react-router-dom'

import { OrderSubnav } from '@/components/admin/orders/order-subnav'
import { useAuth } from '@/hooks/use-auth'

export function AdminOrdersLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const isWarehouseStaff = user?.role === 'WAREHOUSE_STAFF'
  const isWarehousePenjualan = isWarehouseStaff && pathname.includes('/pesanan/penjualan')
  const showSubnav =
    user?.role !== 'SALES_STAFF' && user?.role !== 'FINANCE_STAFF' && !isWarehouseStaff

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          {isWarehousePenjualan ? 'Penjualan' : 'Pesanan'}
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          {isWarehousePenjualan
            ? 'Tampilan packing: jenis produk, jenis kemasan, dan total berat dalam kg. Satu ons = 0,1 kg.'
            : 'Order penjualan ke pelanggan dan order pembelian bahan dari supplier. Verifikasi pembayaran & stok untuk penjualan hanya dapat dilakukan oleh pemilik (owner).'}
        </p>
      </div>

      {showSubnav ? <OrderSubnav /> : null}

      <Outlet />
    </div>
  )
}
