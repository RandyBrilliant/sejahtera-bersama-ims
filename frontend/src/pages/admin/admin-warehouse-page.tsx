import { IngredientSummaryStats } from '@/components/admin/inventory/ingredient-summary-stats'

export function AdminWarehousePage() {
  return (
    <div className="space-y-8">
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
            <span className="text-on-surface font-medium">Produksi</span> — batch harian (bahan →
            kemasan).
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
