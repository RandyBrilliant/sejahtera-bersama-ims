import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { IngredientStockMovementsTable } from '@/components/admin/inventory/ingredient-stock-movements-table'
import { Button } from '@/components/ui/button'

export function AdminIngredientMovementsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Penerimaan bahan
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            Riwayat penerimaan (goods receipt) dan pengeluaran (goods issue) bahan baku. Ketuk Catat
            penerimaan untuk mengisi bahan langkah demi langkah.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-12 shrink-0 gap-2 px-5 text-base font-semibold"
          asChild
        >
          <Link to="/admin/gudang/mutasi-bahan/baru">
            <Plus className="size-5" />
            Catat penerimaan
          </Link>
        </Button>
      </div>

      <IngredientStockMovementsTable />
    </div>
  )
}
