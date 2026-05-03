import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'
import { IngredientSummaryStats } from '@/components/admin/inventory/ingredient-summary-stats'
import { IngredientsTable } from '@/components/admin/inventory/ingredients-table'

export function AdminIngredientsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Bahan baku
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Master bahan (nama & satuan default). Setiap bahan baru otomatis mendapat baris stok di
          halaman stok bahan.
        </p>
      </div>

      <WarehouseSubnav />

      <IngredientSummaryStats />

      <IngredientsTable />
    </div>
  )
}
