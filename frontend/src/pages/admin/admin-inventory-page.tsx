import { InventorySummaryStats } from '@/components/admin/inventory/inventory-summary-stats'
import { ProductsTable } from '@/components/admin/inventory/products-table'

export function AdminInventoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Inventaris
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Master produk jadi (varian bawang goreng) dan kemasan (SKU) dengan harga & stok. Bahan baku
          dan operasi gudang ada di menu Gudang. Hapus produk akan menghapus semua kemasan terkait.
        </p>
      </div>

      <InventorySummaryStats />

      <ProductsTable />
    </div>
  )
}
