import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { IngredientStockMovementsTable } from '@/components/admin/inventory/ingredient-stock-movements-table'
import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'
import { Button } from '@/components/ui/button'

export function AdminIngredientMovementsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Mutasi bahan
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            Riwayat masuk dan keluar bahan baku. Setiap baris memperbarui stok sisa pada baris stok
            yang terkait.
          </p>
        </div>
        <Button type="button" className="shrink-0 gap-2" asChild>
          <Link to="/admin/gudang/mutasi-bahan/baru">
            <Plus className="size-4" />
            Catat mutasi
          </Link>
        </Button>
      </div>

      <WarehouseSubnav />

      <IngredientStockMovementsTable />
    </div>
  )
}
