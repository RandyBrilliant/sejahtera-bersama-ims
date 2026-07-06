import { Outlet } from 'react-router-dom'

import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'
import { useAuth } from '@/hooks/use-auth'

export function AdminWarehouseLayout() {
  const { user } = useAuth()
  const showSubnav = user?.role === 'ADMIN' || user?.role === 'LEADERSHIP'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Gudang
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Bahan baku, stok bahan, dan mutasi gudang (bahan maupun kemasan produk jadi). Master produk
          dan SKU untuk penjualan tetap di menu{' '}
          <span className="text-on-surface font-medium">Inventaris</span>.
        </p>
      </div>

      {showSubnav ? <WarehouseSubnav /> : null}

      <Outlet />
    </div>
  )
}
