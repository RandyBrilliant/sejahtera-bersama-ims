import { Package, Boxes, Scale, AlertTriangle } from 'lucide-react'

import { useInventorySummaryQuery } from '@/hooks/use-inventory-query'
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'

const NUM =
  'text-on-surface font-heading text-4xl font-bold tabular-nums tracking-tight leading-none sm:text-5xl lg:text-6xl lg:tracking-tighter'

function Card({
  label,
  icon: Icon,
  iconWrap,
  accent,
  children,
  sub,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconWrap: string
  accent: string
  children: React.ReactNode
  sub?: string
}) {
  return (
    <div
      className={cn(
        'ambient-shadow border-outline-variant bg-surface-container-lowest group relative overflow-hidden rounded-xl border p-5 sm:p-6',
        'transition-[box-shadow,transform] duration-200 hover:shadow-md'
      )}
    >
      <div
        className={cn('pointer-events-none absolute inset-x-0 top-0 h-1 opacity-90', accent)}
      />
      <div className="flex items-start justify-between gap-3">
        <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </span>
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 sm:size-12',
            iconWrap
          )}
        >
          <Icon className="size-5 sm:size-6" />
        </span>
      </div>
      <div className="mt-5">
        <div className={NUM}>{children}</div>
        {sub ? (
          <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">{sub}</p>
        ) : null}
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border-outline-variant bg-surface-container-lowest h-[148px] animate-pulse rounded-xl border"
        />
      ))}
    </div>
  )
}

function fmtQty(v: string | number) {
  const n = typeof v === 'string' ? Number(v) : v
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

export function InventorySummaryStats() {
  const { data, isPending, isError, error } = useInventorySummaryQuery()

  if (isPending) {
    return <SkeletonRow />
  }

  if (isError || !data) {
    return (
      <p className="text-destructive text-sm">
        {(error as Error)?.message ?? 'Gagal memuat ringkasan inventaris.'}
      </p>
    )
  }

  const { products, ingredients } = data

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        label="Total kemasan (SKU)"
        icon={Package}
        iconWrap="bg-primary/15 text-primary"
        accent="bg-gradient-to-r from-primary/80 via-primary to-primary/70"
        sub="Varian ukuran per produk (kemasan jadi)."
      >
        {products.total_packaging.toLocaleString('id-ID')}
      </Card>
      <Card
        label="Kemasan aktif"
        icon={Boxes}
        iconWrap="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        accent="bg-gradient-to-r from-emerald-500/90 via-emerald-500 to-emerald-600/90"
        sub="SKU yang masih dijual / diproduksi."
      >
        {products.active_packaging.toLocaleString('id-ID')}
      </Card>
      <Card
        label="Stok paket (jumlah)"
        icon={Scale}
        iconWrap="bg-sky-500/15 text-sky-800 dark:text-sky-300"
        accent="bg-gradient-to-r from-sky-500/85 via-sky-500 to-sky-600/85"
        sub={`Perkiraan nilai (harga pokok × stok): ${formatIdr(products.total_product_stock_value_idr)}`}
      >
        {fmtQty(products.total_product_stock)}
      </Card>
      <Card
        label="Bahan di bawah minimum"
        icon={AlertTriangle}
        iconWrap="bg-amber-500/15 text-amber-800 dark:text-amber-300"
        accent="bg-gradient-to-r from-amber-500/85 via-amber-500 to-amber-600/85"
        sub={`${ingredients.total_ingredient_items.toLocaleString('id-ID')} jenis bahan dilacak · Total kuantitas stok bahan: ${fmtQty(ingredients.total_ingredient_stock)}`}
      >
        {ingredients.low_stock_items.toLocaleString('id-ID')}
      </Card>
    </div>
  )
}
