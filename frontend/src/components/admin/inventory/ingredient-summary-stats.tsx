import { AlertTriangle, Boxes, Scale } from 'lucide-react'

import { useInventorySummaryQuery } from '@/hooks/use-inventory-query'
import { cn } from '@/lib/utils'

function fmtQty(v: string | number) {
  const n = typeof v === 'string' ? Number(v) : v
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

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
        'ambient-shadow border-outline-variant bg-surface-container-lowest group relative overflow-hidden rounded-xl border p-4 sm:p-5',
        'transition-[box-shadow] duration-200 hover:shadow-md'
      )}
    >
      <div
        className={cn('pointer-events-none absolute inset-x-0 top-0 h-1 opacity-90', accent)}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </span>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            iconWrap
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="text-on-surface font-heading mt-3 text-2xl font-bold tabular-nums sm:text-3xl">
        {children}
      </p>
      {sub ? <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">{sub}</p> : null}
    </div>
  )
}

export function IngredientSummaryStats() {
  const { data, isPending, isError, error } = useInventorySummaryQuery()

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="border-outline-variant bg-surface-container-lowest h-28 animate-pulse rounded-xl border"
          />
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="text-destructive text-sm">
        {(error as Error)?.message ?? 'Gagal memuat ringkasan bahan baku.'}
      </p>
    )
  }

  const { ingredients } = data

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card
        label="Jenis bahan"
        icon={Boxes}
        iconWrap="bg-primary/15 text-primary"
        accent="bg-gradient-to-r from-primary/80 via-primary to-primary/70"
        sub="Baris stok bahan baku di sistem."
      >
        {ingredients.total_ingredient_items.toLocaleString('id-ID')}
      </Card>
      <Card
        label="Di bawah minimum"
        icon={AlertTriangle}
        iconWrap="bg-amber-500/15 text-amber-800 dark:text-amber-300"
        accent="bg-gradient-to-r from-amber-500/85 via-amber-500 to-amber-600/85"
        sub="Perlu restock segera."
      >
        {ingredients.low_stock_items.toLocaleString('id-ID')}
      </Card>
      <Card
        label="Total kuantitas stok"
        icon={Scale}
        iconWrap="bg-sky-500/15 text-sky-800 dark:text-sky-300"
        accent="bg-gradient-to-r from-sky-500/85 via-sky-500 to-sky-600/85"
        sub="Dijumlahkan menurut satuan masing-masing pos."
      >
        {fmtQty(ingredients.total_ingredient_stock)}
      </Card>
    </div>
  )
}
