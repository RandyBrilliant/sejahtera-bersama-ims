import { AlertTriangle, Boxes, Package, Scale, Warehouse } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useIngredientInventoriesQuery, useInventorySummaryQuery } from '@/hooks/use-inventory-query'
import { formatProductMassKgFromGrams } from '@/lib/format-product-mass'

function num(v: string | number | undefined | null) {
  if (v == null) return 0
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(n) ? n : 0
}

function fmtKg(v: string | number | undefined | null) {
  return `${num(v).toLocaleString('id-ID', { maximumFractionDigits: 3 })} KG`
}

export function WarehouseDashboardHome() {
  const summary = useInventorySummaryQuery()
  const lowStock = useIngredientInventoriesQuery({
    page: 1,
    page_size: 5,
    is_below_minimum: true,
    ordering: 'remaining_stock',
  })

  const productMass = summary.data?.products.total_product_mass_grams
  const activeSku = summary.data?.products.active_packaging ?? 0
  const ingredientItems = summary.data?.ingredients.total_ingredient_items ?? 0
  const lowCount = summary.data?.ingredients.low_stock_items ?? 0
  const ingredientTotalStock = summary.data?.ingredients.total_ingredient_stock

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Dasbor gudang
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            Ringkasan operasional gudang: stok bahan, stok produk, dan peringatan minimum.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="shrink-0 gap-2">
            <Link to="/admin/gudang/produksi/baru">Catat produksi</Link>
          </Button>
          <Button asChild variant="outline" className="shrink-0 gap-2">
            <Link to="/admin/pesanan/penjualan">Penjualan packing</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Package className="size-4" /> Produk utama
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {summary.isError ? '—' : `${formatProductMassKgFromGrams(productMass ?? 0)} kg`}
          </p>
        </div>
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Boxes className="size-4" /> SKU aktif
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {summary.isError ? '—' : activeSku.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Warehouse className="size-4" /> Item bahan
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {summary.isError ? '—' : ingredientItems.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Scale className="size-4" /> Total stok bahan
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {summary.isError ? '—' : num(ingredientTotalStock).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between border-b pb-3">
          <h2 className="text-on-surface font-heading text-lg font-semibold">Bahan di bawah minimum</h2>
          <span className="text-on-surface-variant text-sm tabular-nums">
            {lowCount.toLocaleString('id-ID')} item
          </span>
        </div>
        {lowStock.isPending ? (
          <p className="text-on-surface-variant text-sm">Memuat…</p>
        ) : lowStock.isError ? (
          <p className="text-destructive text-sm">Gagal memuat data stok minimum.</p>
        ) : (lowStock.data?.results ?? []).length === 0 ? (
          <p className="text-on-surface-variant text-sm">Semua stok bahan berada di atas minimum.</p>
        ) : (
          <ul className="space-y-2">
            {(lowStock.data?.results ?? []).map((item) => (
              <li
                key={item.id}
                className="border-outline-variant flex items-center justify-between gap-3 border-b py-2 last:border-b-0"
              >
                <div>
                  <p className="text-on-surface text-sm font-semibold">{item.ingredient_name}</p>
                  <p className="text-on-surface-variant text-xs tabular-nums">
                    {fmtKg(item.remaining_stock)} (min. {fmtKg(item.minimum_stock)})
                  </p>
                </div>
                <AlertTriangle className="text-error-app size-4 shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
