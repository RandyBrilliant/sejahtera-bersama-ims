import { format, parseISO } from 'date-fns'
import {
  AlertTriangle,
  Banknote,
  Download,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import {
  DashboardTrendChart,
  PackagingStockChart,
} from '@/components/dashboard/admin/admin-dashboard-charts'
import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { Button } from '@/components/ui/button'
import { useAdminDashboardQuery } from '@/hooks/use-admin-dashboard-query'
import { useAuth } from '@/hooks/use-auth'
import { formatRangeSubtitle } from '@/lib/dashboard-ranges'
import { formatProductMassKgFromGrams } from '@/lib/format-product-mass'
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/purchase'

function fmtKg(v: string | number) {
  const n = typeof v === 'string' ? Number(v) : v
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString('id-ID', { maximumFractionDigits: 3 })} KG`
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

function TrendLine({
  trend,
  invertColors,
  error,
  errorText,
}: {
  trend: { type: 'up' | 'down' | 'steady'; text: string }
  invertColors?: boolean
  error?: boolean
  errorText?: string
}) {
  if (error) {
    return <div className="text-on-surface-variant mt-1 text-[13px]">{errorText}</div>
  }

  const positiveIsGood = !invertColors
  const tone =
    trend.type === 'steady'
      ? 'text-on-surface-variant'
      : trend.type === 'up'
        ? positiveIsGood
          ? 'text-trend-positive'
          : 'text-error-app'
        : positiveIsGood
          ? 'text-error-app'
          : 'text-trend-positive'

  return (
    <div className={cn('mt-1 flex items-center gap-1 text-[13px] font-medium tabular-nums', tone)}>
      {trend.type === 'up' && <TrendingUp className="size-4 shrink-0" />}
      {trend.type === 'down' && <TrendingDown className="size-4 shrink-0" />}
      {trend.type === 'steady' && <Minus className="size-4 shrink-0" />}
      {trend.text}
    </div>
  )
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
  const dash = useAdminDashboardQuery()
  const { user } = useAuth()
  const displayName = user?.full_name?.trim() || user?.username || 'Pengguna'

  const versusPrev = 'vs 7 hari sebelumnya'

  const stockValueLabel =
    dash.inventorySummary?.products.total_product_stock_value_idr != null
      ? formatIdr(dash.inventorySummary.products.total_product_stock_value_idr)
      : '—'

  const stockQtySub = dash.inventorySummary
    ? `${formatProductMassKgFromGrams(dash.inventorySummary.products.total_product_mass_grams)} kg · ${dash.inventorySummary.products.active_packaging.toLocaleString('id-ID')} SKU`
    : ''

  const revenueTrend = formatTrend(dash.revenueNow, dash.revenueThen, versusPrev)
  const netCashTrend = formatTrend(dash.netCashNow, dash.netCashThen, versusPrev)
  const ordersTrend = formatTrend(
    dash.verifiedOrdersNow,
    dash.verifiedOrdersThen,
    versusPrev
  )

  const rangeLabel = formatRangeSubtitle(
    dash.rangeCurrent.startDate,
    dash.rangeCurrent.endDate
  )

  const lowRows = dash.lowIngredientRows
  const lowCount =
    dash.inventorySummary?.ingredients.low_stock_items ?? lowRows.length

  const kpiLoading = dash.ordersPending || dash.inventoryPending
  const staffPct =
    dash.usersTotal > 0
      ? Math.round((dash.usersActive / dash.usersTotal) * 100)
      : 0

  return (
    <div className="page-enter space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Selamat datang, {displayName}
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Statistik operasional selama 7 hari
          </p>
          <p className="text-on-surface-variant mt-0.5 text-xs tabular-nums">
            Periode: {rangeLabel}
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {kpiLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <div className="dash-rise ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
                  Pendapatan terverifikasi
                </span>
                <Banknote className="text-primary size-7 shrink-0" aria-hidden />
              </div>
              <div className="mt-4">
                <div className="text-on-surface font-heading text-2xl font-semibold tabular-nums tracking-tight">
                  {dash.revenueError ? '—' : formatIdr(dash.revenueNow)}
                </div>
                <TrendLine
                  trend={revenueTrend}
                  error={dash.revenueError}
                  errorText="Tidak dapat memuat pendapatan."
                />
                {!dash.revenueError && (
                  <p className="text-on-surface-variant mt-1 text-xs tabular-nums">
                    {dash.verifiedOrdersNow.toLocaleString('id-ID')} pesanan ·{' '}
                    {ordersTrend.type === 'up'
                      ? '↑'
                      : ordersTrend.type === 'down'
                        ? '↓'
                        : '→'}{' '}
                    volume vs minggu lalu
                  </p>
                )}
              </div>
            </div>

            <div className="dash-rise dash-rise-delay-1 ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
                  Kas operasional (net)
                </span>
                <Wallet className="text-primary size-7 shrink-0" aria-hidden />
              </div>
              <div className="mt-4">
                <div
                  className={cn(
                    'font-heading text-2xl font-semibold tabular-nums tracking-tight',
                    dash.opsCashError
                      ? 'text-on-surface'
                      : dash.netCashNow >= 0
                        ? 'text-on-surface'
                        : 'text-error-app'
                  )}
                >
                  {dash.opsCashError ? '—' : formatIdr(dash.netCashNow)}
                </div>
                <TrendLine
                  trend={netCashTrend}
                  error={dash.opsCashError}
                  errorText="Akses kas mungkin terbatas — hubungi admin."
                />
                {!dash.opsCashError && (
                  <p className="text-on-surface-variant mt-1 text-xs tabular-nums">
                    Masuk {formatIdr(dash.incomeNow)} · Keluar {formatIdr(dash.expenseNow)}
                  </p>
                )}
              </div>
            </div>

            <div className="dash-rise dash-rise-delay-2 ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
                  Pesanan aktif
                </span>
                <ShoppingCart className="text-primary size-7 shrink-0" aria-hidden />
              </div>
              <div className="mt-4">
                <div className="text-on-surface font-heading text-2xl font-semibold tabular-nums tracking-tight">
                  {dash.activeOrdersTotal.toLocaleString('id-ID')}
                </div>
                <div className="text-on-surface-variant mt-1 flex flex-wrap items-center gap-x-2 text-[13px] font-medium tabular-nums">
                  <Link
                    to="/admin/pesanan/penjualan"
                    className="hover:text-primary transition-colors"
                  >
                    Jual {Math.max(0, dash.activeSalesOrders).toLocaleString('id-ID')}
                  </Link>
                  <span className="text-on-surface-variant/70">·</span>
                  <Link
                    to="/admin/pesanan/pembelian"
                    className="hover:text-primary transition-colors"
                  >
                    Beli {Math.max(0, dash.activePurchaseOrders).toLocaleString('id-ID')}
                  </Link>
                </div>
                <p className="text-on-surface-variant mt-1 text-xs">
                  Belum diverifikasi / dibatalkan
                </p>
              </div>
            </div>

            <div className="dash-rise dash-rise-delay-3 ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
                  {lowCount > 0 ? 'Stok bahan rendah' : 'Nilai stok produk'}
                </span>
                {lowCount > 0 ? (
                  <AlertTriangle className="text-error-app size-7 shrink-0" aria-hidden />
                ) : (
                  <Package className="text-primary size-7 shrink-0" aria-hidden />
                )}
              </div>
              <div className="mt-4">
                {lowCount > 0 ? (
                  <>
                    <div className="text-error-app font-heading text-2xl font-semibold tabular-nums tracking-tight">
                      {lowCount.toLocaleString('id-ID')} item
                    </div>
                    <p className="text-on-surface-variant mt-1 text-[13px] font-medium">
                      Di bawah batas minimum — perlu restock
                    </p>
                    <Link
                      to="/admin/gudang/stok-bahan"
                      className="text-primary mt-1 inline-block text-xs font-semibold hover:underline"
                    >
                      Buka stok bahan
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="text-on-surface font-heading text-2xl font-semibold tabular-nums tracking-tight">
                      {dash.inventoryError ? '—' : stockValueLabel}
                    </div>
                    <p className="text-on-surface-variant mt-1 text-[13px] font-medium tabular-nums">
                      {dash.inventoryError
                        ? 'Gagal memuat inventaris.'
                        : stockQtySub}
                    </p>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
        <section className="dash-rise dash-rise-delay-2 ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5 lg:col-span-3">
          <DashboardTrendChart
            revenueByDay={dash.revenueByDay}
            cashByDay={dash.cashByDay}
            loading={dash.isPending}
          />
        </section>

        <section className="dash-rise dash-rise-delay-3 ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-on-surface font-heading text-lg font-semibold">
                Stok kemasan teratas
              </h2>
              <p className="text-on-surface-variant mt-0.5 text-xs">
                Unit tersisa (hover untuk detail)
              </p>
            </div>
            <Link
              to="/admin/gudang/produk"
              className="text-primary shrink-0 text-xs font-semibold hover:underline"
            >
              Semua
            </Link>
          </div>
          <PackagingStockChart
            rows={dash.topPackagingRows}
            loading={dash.topPackagingPending}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <section className="dash-rise dash-rise-delay-4 ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5 lg:col-span-2">
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
          {dash.activityPending ? (
            <p className="text-on-surface-variant text-sm">Memuat…</p>
          ) : dash.activityRows.length === 0 ? (
            <p className="text-on-surface-variant text-sm">Belum ada pesanan.</p>
          ) : (
            <ul className="divide-outline-variant divide-y">
              {dash.activityRows.map((row, i) => {
                const href =
                  row.kind === 'sales'
                    ? `/admin/pesanan/penjualan/${row.id}`
                    : `/admin/pesanan/pembelian/${row.id}`
                const kindLabel = row.kind === 'sales' ? 'Penjualan' : 'Pembelian'
                const total = Number(row.total_idr ?? 0)
                return (
                  <li
                    key={`${row.kind}-${row.id}`}
                    className="dash-rise"
                    style={{ animationDelay: `${320 + i * 40}ms` }}
                  >
                    <Link
                      to={href}
                      className="hover:bg-surface-container-low -mx-2 flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-on-surface text-sm font-semibold">
                          {row.order_code}{' '}
                          <span className="text-on-surface-variant font-normal">
                            · {kindLabel}
                          </span>
                        </div>
                        <div className="text-on-surface-variant text-xs tabular-nums">
                          {format(parseISO(row.created_at), 'd MMM yyyy, HH:mm')}
                          {!Number.isNaN(total) && total > 0 ? (
                            <>
                              {' '}
                              · <span className="text-on-surface font-medium">{formatIdr(total)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <OrderStatusBadge status={row.status as OrderStatus} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6 lg:space-y-8">
          <section className="dash-rise dash-rise-delay-4 ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
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
                {lowCount.toLocaleString('id-ID')} di bawah min.
              </span>
            </div>
            {dash.lowIngredientPending ? (
              <p className="text-on-surface-variant text-sm">Memuat…</p>
            ) : lowRows.length === 0 ? (
              <p className="text-on-surface-variant text-sm">
                Semua stok bahan di atas batas minimum.
              </p>
            ) : (
              <ul className="space-y-2">
                {lowRows.map((inv) => {
                  const rem = Number(inv.remaining_stock)
                  const min = Number(inv.minimum_stock)
                  const pct =
                    !Number.isNaN(min) && min > 0 && !Number.isNaN(rem)
                      ? Math.min(100, Math.round((rem / min) * 100))
                      : 0
                  return (
                    <li key={inv.id} className="space-y-1.5 py-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-on-surface truncate text-sm font-semibold">
                            {inv.ingredient_name}
                          </div>
                          <div className="text-error-app text-[12px] font-medium tabular-nums">
                            {fmtKg(inv.remaining_stock)} / min {fmtKg(inv.minimum_stock)}
                          </div>
                        </div>
                        <Link
                          to="/admin/gudang/stok-bahan"
                          className="border-outline-variant text-primary shrink-0 rounded border bg-surface-app px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase transition-colors hover:bg-surface-container-low"
                        >
                          Buka
                        </Link>
                      </div>
                      <div className="bg-surface-container-high h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-error-app h-full rounded-full transition-[width] duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="dash-rise dash-rise-delay-5 ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
            <div className="border-outline-variant mb-3 flex items-center justify-between border-b pb-3">
              <h2 className="text-on-surface font-heading text-lg font-semibold">Staf</h2>
              <Users className="text-on-surface-variant size-5" aria-hidden />
            </div>
            {dash.usersPending ? (
              <p className="text-on-surface-variant text-sm">Memuat…</p>
            ) : (
              <div className="flex items-center gap-4 py-1">
                <div
                  className="relative flex size-16 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--primary) ${staffPct * 3.6}deg, #e8e6f0 0)`,
                  }}
                >
                  <div className="bg-surface-container-lowest flex size-12 items-center justify-center rounded-full">
                    <span className="text-primary font-heading text-sm font-bold tabular-nums">
                      {staffPct}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-on-surface text-base">
                    <strong>{dash.usersActive.toLocaleString('id-ID')}</strong> /{' '}
                    {dash.usersTotal.toLocaleString('id-ID')}
                  </div>
                  <div className="text-on-surface-variant text-sm">Akun aktif</div>
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
