import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import {
  CashFlowChart,
  ProductStockBars,
  RevenueAreaChart,
} from '@/components/dashboard/admin/admin-dashboard-charts'
import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { Button } from '@/components/ui/button'
import { useAdminDashboardQuery } from '@/hooks/use-admin-dashboard-query'
import { useAuth } from '@/hooks/use-auth'
import { CHART, compactIdr } from '@/lib/dashboard-chart'
import { formatProductMassKgFromGrams } from '@/lib/format-product-mass'
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/purchase'

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

type Delta = { dir: 'up' | 'down' | 'flat' | 'new'; pct: number | null }

function computeDelta(current: number, previous: number): Delta {
  if (previous === 0 && current === 0) return { dir: 'flat', pct: 0 }
  if (previous === 0) return { dir: 'new', pct: null }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  if (Math.abs(pct) < 0.05) return { dir: 'flat', pct: 0 }
  return { dir: pct > 0 ? 'up' : 'down', pct }
}

function greeting(now: Date): string {
  const h = now.getHours()
  if (h < 11) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Animates a number from its previous value to `target` (≈700ms, ease-out). */
function useCountUp(target: number, enabled = true): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (!enabled) return
    const from = fromRef.current
    const duration = prefersReducedMotion() ? 0 : 700
    let start: number | null = null
    let frame = 0
    const tick = (t: number) => {
      start ??= t
      const p = duration === 0 ? 1 : Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(from + (target - from) * eased)
      if (p < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, enabled])

  return enabled ? value : target
}

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

function Card({
  className,
  children,
  delay = 0,
}: {
  className?: string
  children: ReactNode
  delay?: number
}) {
  return (
    <section
      className={cn(
        'dash-rise border-outline-variant/60 rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] md:p-6',
        className
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </section>
  )
}

function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-on-surface text-[15px] font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-on-surface-variant mt-0.5 text-xs">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-on-surface-variant hover:text-primary inline-flex shrink-0 items-center gap-0.5 rounded-md text-xs font-medium transition-colors"
    >
      {children}
      <ChevronRight className="size-3.5" />
    </Link>
  )
}

function DeltaPill({ delta, upIsGood = true }: { delta: Delta; upIsGood?: boolean }) {
  if (delta.dir === 'new') {
    return (
      <span className="bg-surface-container-low text-on-surface-variant inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold">
        Baru
      </span>
    )
  }
  const good = delta.dir === 'flat' ? null : (delta.dir === 'up') === upIsGood
  const Icon = delta.dir === 'up' ? ArrowUpRight : delta.dir === 'down' ? ArrowDownRight : Minus
  const pct = delta.pct ?? 0
  const label =
    delta.dir === 'flat'
      ? '0%'
      : `${pct > 0 ? '+' : '−'}${Math.abs(pct).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        good === null && 'bg-surface-container-low text-on-surface-variant',
        good === true && 'bg-emerald-50 text-emerald-700',
        good === false && 'bg-red-50 text-red-700'
      )}
    >
      <Icon className="size-3" strokeWidth={2.5} />
      {label}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-surface-container-low animate-pulse rounded-md', className)} />
}

function MiniStat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-on-surface-variant truncate text-[11px] font-medium">{label}</p>
      <p className="text-on-surface mt-1 truncate text-[15px] font-semibold">{value}</p>
      {hint ? <p className="text-on-surface-variant mt-0.5 truncate text-[11px]">{hint}</p> : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export function AdminDashboardHome() {
  const dash = useAdminDashboardQuery()
  const { user } = useAuth()
  const displayName = user?.full_name?.trim() || user?.username || 'Pengguna'
  const now = new Date()
  const loading = dash.isPending

  const rangeStart = parseISO(dash.rangeCurrent.startDate)
  const rangeEnd = parseISO(dash.rangeCurrent.endDate)
  const rangeLabel = `${format(rangeStart, 'd MMM', { locale: localeId })} – ${format(rangeEnd, 'd MMM yyyy', { locale: localeId })}`

  // Revenue
  const revenueDelta = computeDelta(dash.revenueNow, dash.revenueThen)
  const ordersDelta = computeDelta(dash.verifiedOrdersNow, dash.verifiedOrdersThen)
  const revenueAnimated = useCountUp(dash.revenueNow, !loading)
  const days = Math.max(1, dash.revenueByDay.length || 7)
  const avgPerDay = dash.revenueNow / days
  const avgOrder = dash.verifiedOrdersNow > 0 ? dash.revenueNow / dash.verifiedOrdersNow : 0

  // Cash
  const netDelta = computeDelta(dash.netCashNow, dash.netCashThen)
  const netAnimated = useCountUp(dash.netCashNow, !loading)
  const cashTotal = dash.incomeNow + dash.expenseNow
  const incomeShare = cashTotal > 0 ? (dash.incomeNow / cashTotal) * 100 : 50

  // Inventory
  const inv = dash.inventorySummary
  const lowRows = dash.lowIngredientRows
  const lowCount = inv?.ingredients.low_stock_items ?? lowRows.length
  const ingredientTotal = inv?.ingredients.total_ingredient_items ?? 0
  const healthyIngredients = Math.max(0, ingredientTotal - lowCount)

  const staffPct = dash.usersTotal > 0 ? Math.round((dash.usersActive / dash.usersTotal) * 100) : 0

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="dash-rise flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-on-surface-variant text-[13px] font-medium capitalize">
            {format(now, 'EEEE, d MMMM yyyy', { locale: localeId })}
          </p>
          <h1 className="text-on-surface mt-1 text-[26px] leading-tight font-bold tracking-[-0.02em] md:text-[30px]">
            {greeting(now)}, {displayName.split(' ')[0]}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="border-outline-variant/70 text-on-surface-variant inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-xs font-medium">
            <CalendarDays className="size-3.5" />
            7 hari terakhir
            <span className="text-on-surface tabular-nums">{rangeLabel}</span>
          </span>
          <Button variant="outline" className="h-9 gap-1.5 rounded-lg bg-white text-xs font-semibold" asChild>
            <Link to="/admin/analitik">
              <BarChart3 className="size-3.5" />
              Analitik
            </Link>
          </Button>
          <Button className="h-9 gap-1.5 rounded-lg text-xs font-semibold" asChild>
            <Link to="/admin/pesanan/penjualan/baru">
              <Plus className="size-3.5" />
              Pesanan baru
            </Link>
          </Button>
        </div>
      </header>

      {dash.isError ? (
        <div className="dash-rise flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Gagal memuat data dasbor.
          </span>
          <button type="button" onClick={() => dash.refetch()} className="font-semibold underline-offset-2 hover:underline">
            Coba lagi
          </button>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ */}
      {/* Row 1 — revenue hero + side KPIs                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8" delay={40}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-on-surface-variant text-[13px] font-medium">Pendapatan terverifikasi</p>
              {loading ? (
                <Skeleton className="mt-2 h-11 w-56" />
              ) : (
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <span className="text-on-surface text-[40px] leading-none font-bold tracking-[-0.03em] md:text-[44px]">
                    {formatIdr(revenueAnimated)}
                  </span>
                  <DeltaPill delta={revenueDelta} />
                </div>
              )}
              <p className="text-on-surface-variant mt-2 text-xs">
                vs 7 hari sebelumnya{' '}
                <span className="text-on-surface font-medium tabular-nums">{formatIdr(dash.revenueThen)}</span>
              </p>
            </div>

            <div className="border-outline-variant/60 grid grid-cols-3 gap-5 border-t pt-4 lg:min-w-[340px] lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              <MiniStat
                label="Pesanan"
                value={loading ? '—' : dash.verifiedOrdersNow.toLocaleString('id-ID')}
                hint={loading ? undefined : <DeltaPill delta={ordersDelta} />}
              />
              <MiniStat label="Rata-rata/hari" value={loading ? '—' : `Rp ${compactIdr(avgPerDay)}`} />
              <MiniStat label="Per pesanan" value={loading ? '—' : `Rp ${compactIdr(avgOrder)}`} />
            </div>
          </div>

          <div className="mt-4 -mb-1">
            <RevenueAreaChart rows={dash.revenueByDay} loading={loading} />
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 xl:col-span-4 xl:grid-cols-1">
          {/* Net cash */}
          <Card delay={100}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-on-surface-variant text-[13px] font-medium">Kas operasional bersih</p>
              {!loading ? <DeltaPill delta={netDelta} /> : null}
            </div>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-40" />
            ) : (
              <p
                className={cn(
                  'mt-2 text-[28px] leading-none font-bold tracking-[-0.02em]',
                  dash.netCashNow < 0 ? 'text-red-700' : 'text-on-surface'
                )}
              >
                {dash.netCashNow > 0 ? '+' : ''}
                {formatIdr(netAnimated)}
              </p>
            )}

            <div className="mt-5 flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              <div
                className="h-full rounded-l-full transition-[width] duration-700 ease-out"
                style={{ width: `${incomeShare}%`, background: CHART.series1 }}
              />
              <div className="h-full flex-1 rounded-r-full" style={{ background: CHART.series2 }} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-on-surface-variant inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[3px]" style={{ background: CHART.series1 }} />
                  Pemasukan
                </dt>
                <dd className="text-on-surface mt-0.5 font-semibold tabular-nums">{formatIdr(dash.incomeNow)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[3px]" style={{ background: CHART.series2 }} />
                  Pengeluaran
                </dt>
                <dd className="text-on-surface mt-0.5 font-semibold tabular-nums">{formatIdr(dash.expenseNow)}</dd>
              </div>
            </dl>
          </Card>

          {/* Active orders */}
          <Card delay={160}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-on-surface-variant text-[13px] font-medium">Pesanan aktif</p>
              <CardLink to="/admin/pesanan/penjualan">Lihat</CardLink>
            </div>
            {loading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="text-on-surface mt-2 text-[28px] leading-none font-bold tracking-[-0.02em]">
                {dash.activeOrdersTotal.toLocaleString('id-ID')}
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                to="/admin/pesanan/penjualan"
                className="bg-surface-container-low/70 hover:bg-surface-container-low group rounded-xl px-3 py-2.5 transition-colors"
              >
                <span className="text-on-surface-variant inline-flex items-center gap-1.5 text-[11px] font-medium">
                  <ShoppingBag className="size-3.5" /> Penjualan
                </span>
                <p className="text-on-surface mt-0.5 text-base font-semibold">
                  {Math.max(0, dash.activeSalesOrders).toLocaleString('id-ID')}
                </p>
              </Link>
              <Link
                to="/admin/pesanan/pembelian"
                className="bg-surface-container-low/70 hover:bg-surface-container-low group rounded-xl px-3 py-2.5 transition-colors"
              >
                <span className="text-on-surface-variant inline-flex items-center gap-1.5 text-[11px] font-medium">
                  <Truck className="size-3.5" /> Pembelian
                </span>
                <p className="text-on-surface mt-0.5 text-base font-semibold">
                  {Math.max(0, dash.activePurchaseOrders).toLocaleString('id-ID')}
                </p>
              </Link>
            </div>
            <p className="text-on-surface-variant mt-3 text-[11px]">Belum diverifikasi atau dibatalkan</p>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Row 2 — cash flow + product stock                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7" delay={200}>
          <CardHeader
            title="Arus kas harian"
            subtitle="Pemasukan dan pengeluaran operasional per hari"
            action={
              <div className="text-on-surface-variant flex items-center gap-4 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[3px]" style={{ background: CHART.series1 }} />
                  Pemasukan
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[3px]" style={{ background: CHART.series2 }} />
                  Pengeluaran
                </span>
              </div>
            }
          />
          <CashFlowChart rows={dash.cashByDay} loading={loading} />
        </Card>

        <Card className="xl:col-span-5" delay={240}>
          <CardHeader
            title="Stok produk teratas"
            subtitle="Massa stok utama per varian"
            action={<CardLink to="/admin/gudang/produk">Semua</CardLink>}
          />
          <ProductStockBars rows={dash.topProductRows} loading={loading} />
          {inv ? (
            <div className="border-outline-variant/60 mt-6 grid grid-cols-2 gap-4 border-t pt-4">
              <MiniStat label="Nilai stok produk" value={formatIdr(inv.products.total_product_stock_value_idr)} />
              <MiniStat
                label="Total massa · SKU aktif"
                value={`${formatProductMassKgFromGrams(inv.products.total_product_mass_grams, 1)} kg`}
                hint={`${inv.products.active_packaging.toLocaleString('id-ID')} SKU aktif`}
              />
            </div>
          ) : null}
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Row 3 — activity + ingredient health + staff                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-5 lg:gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7" delay={280}>
          <CardHeader
            title="Aktivitas pesanan terbaru"
            action={<CardLink to="/admin/pesanan/penjualan">Lihat semua</CardLink>}
          />
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : dash.activityRows.length === 0 ? (
            <p className="text-on-surface-variant py-8 text-center text-sm">Belum ada pesanan.</p>
          ) : (
            <ul className="-mx-2">
              {dash.activityRows.map((row, i) => {
                const isSales = row.kind === 'sales'
                const href = isSales
                  ? `/admin/pesanan/penjualan/${row.id}`
                  : `/admin/pesanan/pembelian/${row.id}`
                const total = Number(row.total_idr ?? 0)
                const created = parseISO(row.created_at)
                return (
                  <li key={`${row.kind}-${row.id}`} className="dash-rise" style={{ animationDelay: `${320 + i * 35}ms` }}>
                    <Link
                      to={href}
                      className="hover:bg-surface-container-low/70 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors"
                    >
                      <span
                        className={cn(
                          'grid size-9 shrink-0 place-items-center rounded-lg',
                          isSales ? 'bg-[#efedfb] text-[#4a3bc0]' : 'bg-[#fdefe8] text-[#b8481c]'
                        )}
                        aria-hidden
                      >
                        {isSales ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-on-surface truncate text-[13px] font-semibold">
                          {row.order_code}
                          <span className="text-on-surface-variant font-normal"> · {isSales ? 'Penjualan' : 'Pembelian'}</span>
                        </p>
                        <p
                          className="text-on-surface-variant text-[11px]"
                          title={format(created, 'd MMM yyyy, HH:mm', { locale: localeId })}
                        >
                          {formatDistanceToNowStrict(created, { addSuffix: true, locale: localeId })}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-on-surface text-[13px] font-semibold tabular-nums">
                          {Number.isFinite(total) && total > 0 ? formatIdr(total) : '—'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right sm:w-[150px]">
                        <OrderStatusBadge status={row.status as OrderStatus} />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 xl:col-span-5 xl:grid-cols-1">
          <Card delay={320}>
            <CardHeader
              title="Kesehatan stok bahan"
              subtitle={
                ingredientTotal > 0
                  ? `${healthyIngredients.toLocaleString('id-ID')} dari ${ingredientTotal.toLocaleString('id-ID')} bahan di atas minimum`
                  : undefined
              }
              action={<CardLink to="/admin/gudang/stok-bahan">Stok</CardLink>}
            />
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </div>
            ) : lowRows.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3.5 py-3 text-[13px] text-emerald-800">
                <CheckCircle2 className="size-4 shrink-0" />
                Semua stok bahan di atas batas minimum.
              </div>
            ) : (
              <ul className="space-y-3.5">
                <li className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-800">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {lowCount.toLocaleString('id-ID')} bahan di bawah minimum — perlu restock
                </li>
                {lowRows.slice(0, 5).map((row) => {
                  const rem = Number(row.remaining_stock)
                  const min = Number(row.minimum_stock)
                  const pct = min > 0 && Number.isFinite(rem) ? Math.min(100, Math.max(0, (rem / min) * 100)) : 0
                  const unit = row.ingredient_unit === 'PCS' ? 'pcs' : row.ingredient_unit === 'L' ? 'L' : 'kg'
                  const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : '—')
                  return (
                    <li key={row.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="text-on-surface min-w-0 truncate font-medium">{row.ingredient_name}</span>
                        <span className="text-on-surface-variant shrink-0 text-xs tabular-nums">
                          <span className="font-semibold text-red-700">{fmt(rem)}</span> / {fmt(min)} {unit}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-red-100">
                        <div className="dash-bar-grow h-full rounded-full bg-[#d03b3b]" style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card delay={360}>
            <CardHeader title="Akun staf" action={<CardLink to="/admin/staf">Kelola</CardLink>} />
            {loading ? (
              <Skeleton className="h-10" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-on-surface text-[28px] leading-none font-bold tracking-[-0.02em]">
                    {dash.usersActive.toLocaleString('id-ID')}
                  </span>
                  <span className="text-on-surface-variant text-sm">
                    aktif dari {dash.usersTotal.toLocaleString('id-ID')} akun
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#efedf8]">
                  <div className="dash-bar-grow h-full rounded-full" style={{ width: `${staffPct}%`, background: CHART.series1 }} />
                </div>
                <p className="text-on-surface-variant mt-2 text-[11px] tabular-nums">{staffPct}% akun aktif</p>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
