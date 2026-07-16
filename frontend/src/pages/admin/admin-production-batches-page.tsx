import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { ProductionBatchesTable } from '@/components/admin/inventory/production-batches-table'
import { Button } from '@/components/ui/button'

export function AdminProductionBatchesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Produksi
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            Batch produksi harian: pemakaian bahan baku dan hasil kemasan. Setiap batch memperbarui
            stok secara otomatis dan tidak dapat diubah setelah disimpan.
          </p>
        </div>
        <Button type="button" className="shrink-0 gap-2" asChild>
          <Link to="/admin/gudang/produksi/baru">
            <Plus className="size-4" />
            Catat produksi
          </Link>
        </Button>
      </div>

      <ProductionBatchesTable />
    </div>
  )
}
