import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'
import { ProductStockMovementsTable } from '@/components/admin/inventory/product-stock-movements-table'
import { Button } from '@/components/ui/button'

export function AdminProductMovementsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Mutasi produk
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            Riwayat masuk/keluar per kemasan (SKU). Masuk dapat mencakup bonus; keluar hanya memakai
            kuantitas utama.
          </p>
        </div>
        <Button type="button" className="shrink-0 gap-2" asChild>
          <Link to="/admin/gudang/mutasi-produk/baru">
            <Plus className="size-4" />
            Catat mutasi
          </Link>
        </Button>
      </div>

      <WarehouseSubnav />

      <ProductStockMovementsTable />
    </div>
  )
}
