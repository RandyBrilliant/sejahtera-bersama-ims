import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'
import { IngredientSummaryStats } from '@/components/admin/inventory/ingredient-summary-stats'
import { IngredientInventoryTable } from '@/components/admin/inventory/ingredient-inventory-table'

export function AdminIngredientInventoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Stok bahan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Stok sisa dan ambang minimum per bahan. Ubah nilai manual atau gunakan mutasi bahan untuk
          riwayat masuk/keluar.
        </p>
      </div>

      <WarehouseSubnav />

      <IngredientSummaryStats />

      <IngredientInventoryTable />
    </div>
  )
}
