import { IngredientSummaryStats } from '@/components/admin/inventory/ingredient-summary-stats'
import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'

export function AdminWarehousePage() {
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

      <WarehouseSubnav />

      <IngredientSummaryStats />

      <div className="border-outline-variant bg-surface-container-lowest ambient-shadow rounded-xl border p-5 text-sm leading-relaxed">
        <p className="text-on-surface font-semibold">Navigasi cepat</p>
        <ul className="text-on-surface-variant mt-2 list-inside list-disc space-y-1">
          <li>
            <span className="text-on-surface font-medium">Bahan baku</span> — nama & satuan master.
          </li>
          <li>
            <span className="text-on-surface font-medium">Stok bahan</span> — saldo dan ambang minimum.
          </li>
          <li>
            <span className="text-on-surface font-medium">Mutasi bahan / mutasi produk</span> — riwayat
            masuk-keluar yang memperbarui stok.
          </li>
        </ul>
      </div>
    </div>
  )
}
