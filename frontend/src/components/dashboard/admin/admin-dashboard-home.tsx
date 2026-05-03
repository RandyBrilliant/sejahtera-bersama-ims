import { format, parseISO } from 'date-fns'
import {
  Banknote,
  Download,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { Button } from '@/components/ui/button'
import { useAdminDashboardQuery } from '@/hooks/use-admin-dashboard-query'
import { useInventorySummaryQuery } from '@/hooks/use-inventory-query'
import { formatRangeSubtitle } from '@/lib/dashboard-ranges'
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/purchase'

function fmtQty(v: string | number) {
  const n = typeof v === 'string' ? Number(v) : v
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

function formatTrend(
  current: number,
  previous: number,
  versusLabel: string
): { type: 'up' | 'down' | 'steady'; text: string } {
  if (previous <= 0 && current <= 0) {
    return { type: 'steady', text: `Belum ada data ${versusLabel}` }
  }
  if (previous <= 0) {
    return { type: 'up', text: `Naik dari basis nol ${versusLabel}` }
  }
  const raw = ((current - previous) / previous) * 100
  const rounded = Math.round(raw * 10) / 10
  if (Math.abs(rounded) < 0.05) {
    return { type: 'steady', text: `Stabil ${versusLabel}` }
  }
  if (raw > 0) {
    return {
      type: 'up',
      text: `+${rounded.toLocaleString('id-ID')}% ${versusLabel}`,
    }
  }
  return {
    type: 'down',
    text: `${rounded.toLocaleString('id-ID')}% ${versusLabel}`,
  }
}

function KpiSkeleton() {
  return (
    <div className="ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4">
      <div className="bg-surface-container-high h-4 w-24 animate-pulse rounded" />
      <div className="mt-4 space-y-2">
        <div className="bg-surface-container-high h-8 w-32 animate-pulse rounded" />
        <div className="bg-surface-container-high h-4 w-40 animate-pulse rounded" />
      </div>
    </div>
  )
}

export function AdminDashboardHome() {
  const inventory = useInventorySummaryQuery()
  const dash = useAdminDashboardQuery()

  const versusPrev = 'vs 7 hari sebelumnya'

  const stockValueLabel =
    inventory.data?.products.total_product_stock_value_idr != null
      ? formatIdr(inventory.data.products.total_product_stock_value_idr)
      : '—'

  const stockQtySub = inventory.data
    ? `${fmtQty(inventory.data.products.total_product_stock)} paket · ${inventory.data.products.active_packaging.toLocaleString('id-ID')} SKU aktif`
    : ''

  const revenueTrend = formatTrend(dash.revenueNow, dash.revenueThen, versusPrev)
  const expenseTrend = formatTrend(dash.expenseNow, dash.expenseThen, versusPrev)

  const rangeLabel = formatRangeSubtitle(
    dash.rangeCurrent.startDate,
    dash.rangeCurrent.endDate
  )

  const topRows = dash.topPackaging.data?.results ?? []
  const quantities = topRows.map((r) => Number(r.remaining_stock))
  const maxQty = Math.max(1, ...quantities.map((n) => (Number.isNaN(n) ? 0 : n)))

  const lowRows = dash.lowIngredientStock.data?.results ?? []
  const lowCount =
    inventory.data?.ingredients.low_stock_items ?? lowRows.length

  type ActivityRow =
    | {
        kind: 'sales'
        id: number
        code: string
        status: OrderStatus
        at: string
      }
    | {
        kind: 'purchase'
        id: number
        code: string
        status: OrderStatus
        at: string
      }

  const activityRows: ActivityRow[] = [
    ...(dash.recentSales.data?.results ?? []).map((o) => ({
      kind: 'sales' as const,
      id: o.id,
      code: o.order_code,
      status: o.status,
      at: o.created_at,
    })),
    ...(dash.recentPurchases.data?.results ?? []).map((o) => ({
      kind: 'purchase' as const,
      id: o.id,
      code: o.order_code,
      status: o.status,
      at: o.created_at,
    })),
  ]
    .sort((a, b) => parseISO(b.at).getTime() - parseISO(a.at).getTime())
    .slice(0, 8)

  const totalUsers = dash.usersTotal.data?.count ?? 0
  const activeUsers = dash.usersActive.data?.count ?? 0
  const activePct =
    totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0

  const kpiLoading =
    inventory.isPending ||
    dash.ordersPending ||
    dash.revenueCurrent.isPending ||
    dash.opsCashCurrent.isPending

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Dasbor
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Ringkasan inventaris, pesanan, dan kas — data langsung dari server
          </p>
          <p className="text-on-surface-variant mt-0.5 text-xs tabular-nums">
            Periode pendapatan &amp; biaya: {rangeLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low gap-2 rounded-lg text-[11px] font-semibold tracking-wider uppercase"
            asChild
          >
            <Link to="/admin/analitik">
              <Download className="size-4" />
              Laporan
            </Link>
          </Button>
          <Button
            type="button"
            className="ambient-shadow bg-primary text-primary-foreground hover:opacity-90 gap-2 rounded-lg text-[11px] font-semibold tracking-wider uppercase"
            asChild
          >
            <Link to="/admin/pesanan/penjualan/baru">
              <Plus className="size-4" />
              Pesanan baru
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {kpiLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <div className="ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
                  Nilai stok produk
                </span>
                <span className="bg-surface-container-low text-primary rounded p-1">
                  <Package className="size-5" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-on-surface font-heading text-2xl font-semibold tabular-nums tracking-tight">
                  {inventory.isError ? '—' : stockValueLabel}
                </div>
                <div className="text-on-surface-variant mt-1 text-[13px] leading-[18px] font-medium tabular-nums">
                  {inventory.isError
                    ? 'Gagal memuat ringkasan inventaris.'
                    : stockQtySub}
                </div>
              </div>
            </div>

            <div className="ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
                  Pesanan aktif
                </span>
                <span className="bg-surface-container-low text-primary rounded p-1">
                  <ShoppingCart className="size-5" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-on-surface font-heading text-2xl font-semibold tabular-nums tracking-tight">
                  {(dash.activeOrdersTotal ?? 0).toLocaleString('id-ID')}
                </div>
                <div className="text-on-surface-variant mt-1 flex flex-wrap items-center gap-x-2 text-[13px] leading-[18px] font-medium tabular-nums">
                  <span>
                    Jual: {Math.max(0, dash.activeSalesOrders).toLocaleString('id-ID')}
                  </span>
                  <span className="text-on-surface-variant/70">·</span>
                  <span>
                    Beli:{' '}
                    {Math.max(0, dash.activePurchaseOrders).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            <div className="ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
                  Pendapatan terverifikasi
                </span>
                <span className="bg-surface-container-low text-primary rounded p-1">
                  <Banknote className="size-5" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-on-surface font-heading text-2xl font-semibold tabular-nums tracking-tight">
                  {dash.revenueCurrent.isError
                    ? '—'
                    : formatIdr(dash.revenueNow)}
                </div>
                <div
                  className={cn(
                    'mt-1 flex items-center gap-1 text-[13px] leading-[18px] font-medium tabular-nums',
                    dash.revenueCurrent.isError && 'text-on-surface-variant',
                    !dash.revenueCurrent.isError &&
                      revenueTrend.type === 'up' &&
                      'text-trend-positive',
                    !dash.revenueCurrent.isError &&
                      revenueTrend.type === 'down' &&
                      'text-error-app',
                    !dash.revenueCurrent.isError &&
                      revenueTrend.type === 'steady' &&
                      'text-on-surface-variant'
                  )}
                >
                  {!dash.revenueCurrent.isError && (
                    <>
                      {revenueTrend.type === 'up' && (
                        <TrendingUp className="size-4 shrink-0" />
                      )}
                      {revenueTrend.type === 'down' && (
                        <TrendingDown className="size-4 shrink-0" />
                      )}
                      {revenueTrend.type === 'steady' && (
                        <Minus className="size-4 shrink-0" />
                      )}
                    </>
                  )}
                  {dash.revenueCurrent.isError
                    ? 'Tidak dapat memuat laporan pendapatan.'
                    : revenueTrend.text}
                </div>
              </div>
            </div>

            <div className="ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
                  Pengeluaran operasional
                </span>
                <span className="bg-surface-container-low text-primary rounded p-1">
                  <Wallet className="size-5" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-on-surface font-heading text-2xl font-semibold tabular-nums tracking-tight">
                  {dash.opsCashCurrent.isError
                    ? '—'
                    : formatIdr(dash.expenseNow)}
                </div>
                <div
                  className={cn(
                    'mt-1 flex items-center gap-1 text-[13px] leading-[18px] font-medium tabular-nums',
                    dash.opsCashCurrent.isError && 'text-on-surface-variant',
                    !dash.opsCashCurrent.isError &&
                      expenseTrend.type === 'up' &&
                      'text-error-app',
                    !dash.opsCashCurrent.isError &&
                      expenseTrend.type === 'down' &&
                      'text-trend-positive',
                    !dash.opsCashCurrent.isError &&
                      expenseTrend.type === 'steady' &&
                      'text-on-surface-variant'
                  )}
                >
                  {!dash.opsCashCurrent.isError && (
                    <>
                      {expenseTrend.type === 'up' && (
                        <TrendingUp className="size-4 shrink-0" />
                      )}
                      {expenseTrend.type === 'down' && (
                        <TrendingDown className="size-4 shrink-0" />
                      )}
                      {expenseTrend.type === 'steady' && (
                        <Minus className="size-4 shrink-0" />
                      )}
                    </>
                  )}
                  {dash.opsCashCurrent.isError
                    ? 'Akun ini mungkin tidak punya akses kas operasional — hubungi admin.'
                    : expenseTrend.text}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2 lg:space-y-8">
          <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
            <div className="border-outline-variant mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-on-surface font-heading text-lg font-semibold">
                Stok kemasan tertinggi
              </h2>
              <button
                type="button"
                className="text-on-surface-variant hover:text-primary transition-colors"
                aria-label="Menu lainnya"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </div>
            {dash.topPackaging.isPending ? (
              <div className="text-on-surface-variant flex h-48 items-center justify-center text-sm">
                Memuat data kemasan…
              </div>
            ) : topRows.length === 0 ? (
              <div className="text-on-surface-variant flex h-48 items-center justify-center text-sm">
                Belum ada kemasan aktif.
              </div>
            ) : (
              <>
                <div className="flex h-64 items-end gap-2 px-2 pb-2">
                  {topRows.slice(0, 6).map((row, i) => {
                    const q = Number(row.remaining_stock)
                    const safe = Number.isNaN(q) ? 0 : q
                    const pct = Math.min(100, Math.round((safe / maxQty) * 100))
                    const isHi = i === 0
                    return (
                      <div
                        key={row.id}
                        className="flex h-full min-h-0 flex-1 flex-col justify-end"
                        title={`${row.product_variant_name} · ${row.label}`}
                      >
                        <div
                          className={cn(
                            'w-full min-h-[6px] rounded-t-sm transition-opacity',
                            isHi
                              ? 'bg-primary'
                              : 'bg-surface-container-low hover:opacity-90'
                          )}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="border-outline-variant text-on-surface-variant flex justify-between gap-1 overflow-x-auto border-t px-2 pt-2 text-[10px] font-semibold tracking-wider uppercase">
                  {topRows.slice(0, 6).map((row) => (
                    <span key={row.id} className="min-w-0 flex-1 truncate text-center">
                      {row.label || row.sku}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
            <div className="border-outline-variant mb-3 flex items-center justify-between border-b pb-3">
              <h2 className="text-on-surface font-heading text-lg font-semibold">
                Aktivitas pesanan terbaru
              </h2>
              <Link
                to="/admin/pesanan/penjualan"
                className="text-primary text-xs font-semibold hover:underline"
              >
                Lihat semua
              </Link>
            </div>
            {dash.recentSales.isPending || dash.recentPurchases.isPending ? (
              <p className="text-on-surface-variant text-sm">Memuat…</p>
            ) : activityRows.length === 0 ? (
              <p className="text-on-surface-variant text-sm">Belum ada pesanan.</p>
            ) : (
              <ul className="divide-outline-variant max-h-72 divide-y overflow-auto">
                {activityRows.map((row) => {
                  const href =
                    row.kind === 'sales'
                      ? `/admin/pesanan/penjualan/${row.id}`
                      : `/admin/pesanan/pembelian/${row.id}`
                  const kindLabel = row.kind === 'sales' ? 'Penjualan' : 'Pembelian'
                  return (
                    <li key={`${row.kind}-${row.id}`}>
                      <Link
                        to={href}
                        className="hover:bg-surface-container-low -mx-2 flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition-colors"
                      >
                        <div>
                          <div className="text-on-surface text-sm font-semibold">
                            {row.code}{' '}
                            <span className="text-on-surface-variant font-normal">
                              · {kindLabel}
                            </span>
                          </div>
                          <div className="text-on-surface-variant text-xs tabular-nums">
                            {format(parseISO(row.at), 'd MMM yyyy, HH:mm')}
                          </div>
                        </div>
                        <OrderStatusBadge status={row.status} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6 lg:space-y-8">
          <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
            <div className="border-outline-variant mb-3 flex items-center justify-between border-b pb-3">
              <h2 className="text-on-surface font-heading text-lg font-semibold">
                Kesehatan stok bahan
              </h2>
              <span
                className={cn(
                  'rounded-full px-2 py-1 text-[11px] font-semibold tracking-wider uppercase',
                  lowCount > 0
                    ? 'bg-error-container-app text-on-error-container-app'
                    : 'bg-surface-container-high text-on-surface-variant'
                )}
              >
                {lowCount.toLocaleString('id-ID')} di bawah minimum
              </span>
            </div>
            {dash.lowIngredientStock.isPending ? (
              <p className="text-on-surface-variant text-sm">Memuat…</p>
            ) : lowRows.length === 0 ? (
              <p className="text-on-surface-variant text-sm">
                Semua stok bahan di atas batas minimum.
              </p>
            ) : (
              <ul className="space-y-2">
                {lowRows.map((inv) => (
                  <li
                    key={inv.id}
                    className="border-surface-container-high flex items-center justify-between gap-3 border-b py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="text-on-surface truncate text-sm font-semibold">
                        {inv.ingredient_name}
                      </div>
                      <div className="text-error-app text-[13px] font-medium tabular-nums">
                        {fmtQty(inv.remaining_stock)} / min{' '}
                        {fmtQty(inv.minimum_stock)} {inv.ingredient_unit}
                      </div>
                    </div>
                    <Link
                      to="/admin/gudang/stok-bahan"
                      className="border-outline-variant text-primary shrink-0 rounded border bg-surface-app px-3 py-1 text-[11px] font-semibold tracking-wider uppercase transition-colors hover:bg-surface-container-low"
                    >
                      Buka
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
            <div className="border-outline-variant mb-3 flex items-center justify-between border-b pb-3">
              <h2 className="text-on-surface font-heading text-lg font-semibold">Staf</h2>
              <Users className="text-on-surface-variant size-5" aria-hidden />
            </div>
            {dash.usersTotal.isPending ? (
              <p className="text-on-surface-variant text-sm">Memuat…</p>
            ) : (
              <div className="flex items-center gap-4 py-2">
                <div className="border-primary bg-surface-container-low text-primary flex size-16 items-center justify-center rounded-full border-4 border-r-surface-container-low">
                  <span className="font-heading text-lg font-bold tabular-nums">
                    {activePct}%
                  </span>
                </div>
                <div>
                  <div className="text-on-surface text-base">
                    <strong>{activeUsers.toLocaleString('id-ID')}</strong> /{' '}
                    {totalUsers.toLocaleString('id-ID')}
                  </div>
                  <div className="text-on-surface-variant text-sm">
                    Akun aktif di sistem
                  </div>
                  <Link
                    to="/admin/staf"
                    className="text-primary mt-1 inline-block text-xs font-semibold hover:underline"
                  >
                    Kelola staf
                  </Link>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
