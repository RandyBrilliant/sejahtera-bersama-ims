import { isAxiosError } from 'axios'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { CashTrendChart } from '@/components/admin/analytics/analytics-cash-charts'
import {
  Panel,
  PanelHeader,
  PeriodFilterBar,
  RankedBars,
  SectionError,
  SectionHeading,
  SegmentedControl,
  StatTile,
  type RankedRow,
} from '@/components/admin/analytics/analytics-ui'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { downloadOperationalCashReportExport } from '@/api/expenses'
import { useAnalyticsReportQueries } from '@/hooks/use-analytics-report'
import { alert } from '@/lib/alert'
import {
  buildCombinedAnalyticsCsvRows,
  buildProductionRecapCsvRows,
  buildSalesRevenueCsvRows,
} from '@/lib/analytics-export-csv'
import { downloadCsv } from '@/lib/csv-download'
import { CHART, compactIdr } from '@/lib/dashboard-chart'
import { formatIdr, toFiniteNumber } from '@/lib/format-idr'
import { type ReportPresetId, getDateRangeForPreset, validateDateRange } from '@/lib/report-presets'
import { cn } from '@/lib/utils'

function httpErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const d = error.response?.data as { detail?: string } | undefined
    if (typeof d?.detail === 'string') return d.detail
    if (error.response?.status === 403) return 'Akses ditolak untuk bagian ini.'
  }
  return 'Gagal memuat data.'
}

function fmtDate(iso: string, pattern = 'd MMM yyyy'): string {
  try {
    return format(parseISO(iso), pattern, { locale: localeId })
  } catch {
    return iso
  }
}

function fmtQty(v: string | number): string {
  const n = toFiniteNumber(v)
  return n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

const UNIT_LABEL: Record<string, string> = { KG: 'kg', L: 'L', PCS: 'pcs' }

type CategoryDirection = 'EXPENSE' | 'INCOME'

export function AdminAnalyticsPage() {
  const initialRange = useMemo(() => getDateRangeForPreset('last_30_days'), [])
  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)
  const [presetSelection, setPresetSelection] = useState<ReportPresetId | 'custom'>('last_30_days')
  const [categoryDir, setCategoryDir] = useState<CategoryDirection>('EXPENSE')

  const rangeError = validateDateRange(startDate, endDate)
  const rangeValid = rangeError === null

  const { cash, revenue, production } = useAnalyticsReportQueries(startDate, endDate, rangeValid)

  const applyPreset = useCallback((preset: ReportPresetId) => {
    const r = getDateRangeForPreset(preset)
    setPresetSelection(preset)
    setStartDate(r.start)
    setEndDate(r.end)
  }, [])

  const onRangeChange = useCallback((value: { start: string; end: string }) => {
    setPresetSelection('custom')
    setStartDate(value.start)
    setEndDate(value.end)
  }, [])

  const [exportKey, setExportKey] = useState<string | null>(null)

  const runExport = useCallback(
    async (key: string, fn: () => Promise<void>) => {
      if (!rangeValid) {
        alert.warning('Perbaiki rentang tanggal', rangeError ?? undefined)
        return
      }
      try {
        setExportKey(key)
        await fn()
        alert.success('Unduhan dimulai')
      } catch (e) {
        alert.error('Ekspor gagal', isAxiosError(e) ? String(e.message) : undefined)
      } finally {
        setExportKey(null)
      }
    },
    [rangeError, rangeValid]
  )

  const combinedCsv = useCallback(() => {
    downloadCsv(
      `analitik-gabungan-${startDate}_${endDate}.csv`,
      buildCombinedAnalyticsCsvRows(startDate, endDate, cash.data, revenue.data, production.data)
    )
  }, [cash.data, endDate, production.data, revenue.data, startDate])

  const refetchAll = useCallback(() => {
    void cash.refetch()
    void revenue.refetch()
    void production.refetch()
  }, [cash, revenue, production])

  const isRefetching = rangeValid && (cash.isFetching || revenue.isFetching || production.isFetching)

  /* ------------------------------ derived data ----------------------------- */

  const income = toFiniteNumber(cash.data?.income.total_idr)
  const expense = toFiniteNumber(cash.data?.expense.total_idr)
  const net = cash.data?.net_cash_idr ?? 0
  const revenueTotal = toFiniteNumber(revenue.data?.summary.total_revenue_idr)
  const orderCount = revenue.data?.summary.verified_order_count ?? 0

  const categoryRows = useMemo<RankedRow[]>(
    () =>
      (cash.data?.by_category ?? [])
        .filter((c) => c.direction === categoryDir)
        .map((c) => ({
          id: `${c.category_id}-${c.direction}`,
          label: c.category__name,
          value: Math.abs(toFiniteNumber(c.total_idr)),
          display: formatIdr(Math.abs(toFiniteNumber(c.total_idr))),
        })),
    [cash.data, categoryDir]
  )

  const customerRows = useMemo<RankedRow[]>(
    () =>
      (revenue.data?.by_customer ?? []).map((r) => ({
        id: r.customer_id,
        label: r.customer__name,
        value: toFiniteNumber(r.revenue_idr),
        display: formatIdr(toFiniteNumber(r.revenue_idr)),
        meta: `${r.orders} order`,
      })),
    [revenue.data]
  )

  const packagingRows = useMemo<RankedRow[]>(
    () =>
      (revenue.data?.by_packaging ?? []).map((r) => ({
        id: r.product_packaging_id,
        label: r.product_packaging__product__variant_name,
        sublabel: r.product_packaging__label,
        value: toFiniteNumber(r.revenue_idr),
        display: formatIdr(toFiniteNumber(r.revenue_idr)),
        meta: `${fmtQty(r.total_quantity)} pcs`,
      })),
    [revenue.data]
  )

  const outputRows = useMemo<RankedRow[]>(
    () =>
      (production.data?.packaging_output ?? []).map((r) => ({
        id: r.product_packaging,
        label: r.variant_name,
        sublabel: r.packaging_label,
        value: toFiniteNumber(r.total_output),
        display: fmtQty(r.total_output),
        meta: `Rp ${compactIdr(toFiniteNumber(r.estimated_value_idr))}`,
      })),
    [production.data]
  )

  /** Ingredient usage grouped by unit — bar lengths are only comparable within a unit. */
  const usageByUnit = useMemo(() => {
    const groups = new Map<string, RankedRow[]>()
    for (const r of production.data?.ingredient_usage ?? []) {
      const unit = UNIT_LABEL[r.unit] ?? r.unit
      const list = groups.get(unit) ?? []
      list.push({
        id: r.ingredient_inventory,
        label: r.ingredient_name,
        value: toFiniteNumber(r.total_used),
        display: `${fmtQty(r.total_used)} ${unit}`,
      })
      groups.set(unit, list)
    }
    return [...groups.entries()]
  }, [production.data])

  const loadingCash = cash.isPending && rangeValid
  const loadingRevenue = revenue.isPending && rangeValid
  const loadingProduction = production.isPending && rangeValid

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* --------------------------------------------------------------- */}
      {/* Header                                                          */}
      {/* --------------------------------------------------------------- */}
      <header className="dash-rise flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-on-surface text-[26px] leading-tight font-bold tracking-[-0.02em] md:text-[30px]">
            Analitik & laporan
          </h1>
          <p className="text-on-surface-variant mt-1 text-[13px]">
            Kas operasional, pendapatan terverifikasi, dan produksi
            {rangeValid ? (
              <>
                {' · '}
                <span className="text-on-surface font-medium">
                  {fmtDate(startDate, 'd MMM')} – {fmtDate(endDate)}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="size-9 rounded-lg bg-white p-0"
            disabled={!rangeValid || isRefetching}
            onClick={refetchAll}
            aria-label="Muat ulang"
            title="Muat ulang"
          >
            <RefreshCw className={cn('size-4', isRefetching && 'animate-spin')} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" className="h-9 gap-2 rounded-lg text-[13px] font-semibold" disabled={!rangeValid}>
                {exportKey ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                Ekspor
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl p-1">
              <DropdownMenuLabel className="text-on-surface-variant text-[11px] font-medium">
                Kas operasional (dari server)
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                disabled={exportKey === 'pdf'}
                onSelect={() => runExport('pdf', () => downloadOperationalCashReportExport(startDate, endDate, 'pdf'))}
              >
                <FileText className="size-4" /> Laporan kas — PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                disabled={exportKey === 'csv-kas'}
                onSelect={() =>
                  runExport('csv-kas', () => downloadOperationalCashReportExport(startDate, endDate, 'csv'))
                }
              >
                <FileSpreadsheet className="size-4" /> Laporan kas — CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-on-surface-variant text-[11px] font-medium">
                Excel (CSV, UTF-8)
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                disabled={!revenue.data}
                onSelect={() =>
                  runExport('csv-revenue', async () => {
                    downloadCsv(`pendapatan-${startDate}_${endDate}.csv`, buildSalesRevenueCsvRows(revenue.data!))
                  })
                }
              >
                <FileSpreadsheet className="size-4" /> Pendapatan
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                disabled={!production.data}
                onSelect={() =>
                  runExport('csv-prod', async () => {
                    downloadCsv(`produksi-${startDate}_${endDate}.csv`, buildProductionRecapCsvRows(production.data!))
                  })
                }
              >
                <FileSpreadsheet className="size-4" /> Produksi
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 font-medium"
                onSelect={() => runExport('csv-all', async () => combinedCsv())}
              >
                <FileSpreadsheet className="size-4" /> Gabungan semua bagian
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* --------------------------------------------------------------- */}
      {/* Filter bar                                                      */}
      {/* --------------------------------------------------------------- */}
      <PeriodFilterBar
        id="analytics-range"
        preset={presetSelection}
        startDate={startDate}
        endDate={endDate}
        onPreset={applyPreset}
        onRangeChange={onRangeChange}
      />
      {rangeError ? <SectionError message={rangeError} /> : null}

      {/* --------------------------------------------------------------- */}
      {/* KPI strip                                                       */}
      {/* --------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
        <StatTile
          label="Pendapatan terverifikasi"
          loading={loadingRevenue}
          delay={80}
          value={revenue.isError ? '—' : formatIdr(revenueTotal)}
          hint={
            revenue.data
              ? orderCount > 0
                ? `Rata-rata Rp ${compactIdr(revenueTotal / orderCount)} per order`
                : 'Belum ada order terverifikasi'
              : undefined
          }
        />
        <StatTile
          label="Order terverifikasi"
          loading={loadingRevenue}
          delay={120}
          value={revenue.isError ? '—' : orderCount.toLocaleString('id-ID')}
          hint={revenue.data ? `${revenue.data.by_customer.length.toLocaleString('id-ID')} pelanggan` : undefined}
        />
        <StatTile
          label="Kas operasional bersih"
          loading={loadingCash}
          delay={160}
          tone={net < 0 ? 'negative' : 'default'}
          value={cash.isError ? '—' : `${net > 0 ? '+' : ''}${formatIdr(net)}`}
          hint={
            cash.data ? (
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-[3px]" style={{ background: CHART.series1 }} />
                  Rp {compactIdr(income)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-[3px]" style={{ background: CHART.series2 }} />
                  Rp {compactIdr(expense)}
                </span>
              </span>
            ) : undefined
          }
        />
        <StatTile
          label="Estimasi nilai produksi"
          loading={loadingProduction}
          delay={200}
          value={production.isError ? '—' : formatIdr(production.data?.summary.estimated_production_value_idr)}
          hint={
            production.data
              ? `${production.data.summary.total_batches.toLocaleString('id-ID')} batch · ${fmtQty(production.data.summary.total_packages_output)} kemasan`
              : undefined
          }
        />
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Cash                                                            */}
      {/* --------------------------------------------------------------- */}
      <div className="space-y-4">
        <SectionHeading title="Kas operasional" description="Arus kas harian dan sebaran per kategori." />
        {cash.isError ? <SectionError message={httpErrorMessage(cash.error)} /> : null}

        <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-12">
          <Panel className="xl:col-span-8" delay={240}>
            <PanelHeader
              title="Arus kas harian"
              subtitle="Arahkan kursor untuk melihat net per hari"
              action={
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-3.5 rounded-full" style={{ background: CHART.series1 }} />
                    <span className="text-on-surface-variant">Pemasukan</span>
                    <span className="text-on-surface font-semibold tabular-nums">Rp {compactIdr(income)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-3.5 rounded-full" style={{ background: CHART.series2 }} />
                    <span className="text-on-surface-variant">Pengeluaran</span>
                    <span className="text-on-surface font-semibold tabular-nums">Rp {compactIdr(expense)}</span>
                  </span>
                </div>
              }
            />
            {loadingCash ? (
              <div className="bg-surface-container-low/70 h-[300px] animate-pulse rounded-xl" />
            ) : (
              <CashTrendChart byDay={cash.data?.by_day ?? []} />
            )}
          </Panel>

          <Panel className="xl:col-span-4" delay={280}>
            <PanelHeader
              title="Per kategori"
              action={
                <SegmentedControl
                  ariaLabel="Arah kas"
                  value={categoryDir}
                  onChange={setCategoryDir}
                  options={[
                    { id: 'EXPENSE', label: 'Keluar' },
                    { id: 'INCOME', label: 'Masuk' },
                  ]}
                />
              }
            />
            {loadingCash ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="bg-surface-container-low h-7 animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <RankedBars
                rows={categoryRows}
                color={categoryDir === 'EXPENSE' ? CHART.series2 : CHART.series1}
                limit={6}
                formatOther={(t) => formatIdr(t)}
                emptyText={categoryDir === 'EXPENSE' ? 'Belum ada pengeluaran.' : 'Belum ada pemasukan.'}
              />
            )}
          </Panel>
        </div>

        {cash.data ? (
          <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-12">
            <Panel className="xl:col-span-4" delay={320}>
              <PanelHeader title="Tautan ke pesanan" subtitle="Entri kas yang terhubung ke pesanan penjualan" />
              <dl className="divide-outline-variant/60 divide-y text-[13px]">
                <div className="flex items-center justify-between gap-3 pb-3">
                  <dt className="text-on-surface-variant inline-flex items-center gap-2">
                    <Link2 className="size-3.5" /> Terhubung ke SO
                  </dt>
                  <dd className="text-right">
                    <span className="text-on-surface font-semibold tabular-nums">
                      {formatIdr(cash.data.linked_breakdown.linked_to_sales_order.total_idr)}
                    </span>
                    <span className="text-on-surface-variant block text-[11px]">
                      {cash.data.linked_breakdown.linked_to_sales_order.line_count} baris
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-on-surface-variant">Masuk tanpa tautan</dt>
                  <dd className="text-on-surface font-semibold tabular-nums">
                    {formatIdr(cash.data.linked_breakdown.unlinked.income_idr)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 pt-3">
                  <dt className="text-on-surface-variant">Keluar tanpa tautan</dt>
                  <dd className="text-right">
                    <span className="text-on-surface font-semibold tabular-nums">
                      {formatIdr(cash.data.linked_breakdown.unlinked.expense_idr)}
                    </span>
                    <span className="text-on-surface-variant block text-[11px]">
                      {cash.data.linked_breakdown.unlinked.line_count} baris tanpa tautan
                    </span>
                  </dd>
                </div>
              </dl>
            </Panel>

            <Panel className="xl:col-span-8 p-0 md:p-0" delay={360}>
              <div className="px-5 pt-5 md:px-6 md:pt-6">
                <PanelHeader
                  title="Entri kas"
                  subtitle={
                    cash.data.entries.truncated
                      ? `Menampilkan ${cash.data.entries.returned_count.toLocaleString('id-ID')} dari ${cash.data.entries.total_count.toLocaleString('id-ID')} entri — ekspor CSV untuk data lengkap`
                      : `${cash.data.entries.total_count.toLocaleString('id-ID')} entri`
                  }
                  action={
                    <Link to="/admin/kas/entri" className="text-on-surface-variant hover:text-primary text-xs font-medium">
                      Buka kas
                    </Link>
                  }
                />
              </div>
              {cash.data.entries.rows.length === 0 ? (
                <p className="text-on-surface-variant px-6 pb-6 text-sm">Tidak ada entri.</p>
              ) : (
                <div className="max-h-[340px] overflow-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
                      <tr className="text-on-surface-variant border-outline-variant/60 border-b text-left text-[11px] font-medium [&_th]:px-3 [&_th]:py-2 [&_th:first-child]:pl-5 md:[&_th:first-child]:pl-6 [&_th:last-child]:pr-5 md:[&_th:last-child]:pr-6">
                        <th>Tanggal</th>
                        <th>Kategori</th>
                        <th className="hidden md:table-cell">Keterangan</th>
                        <th className="text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-outline-variant/40 divide-y [&_td]:px-3 [&_td]:py-2.5 [&_td:first-child]:pl-5 md:[&_td:first-child]:pl-6 [&_td:last-child]:pr-5 md:[&_td:last-child]:pr-6">
                      {cash.data.entries.rows.map((row) => {
                        const isIncome = row.direction === 'INCOME'
                        return (
                          <tr key={row.id} className="hover:bg-slate-900/[0.02]">
                            <td className="text-on-surface-variant whitespace-nowrap tabular-nums">
                              {fmtDate(row.occurred_on, 'd MMM')}
                            </td>
                            <td className="max-w-[180px]">
                              <span className="inline-flex max-w-full items-center gap-2">
                                <span
                                  className={cn(
                                    'grid size-5 shrink-0 place-items-center rounded-md',
                                    isIncome ? 'bg-[#efedfb] text-[#4a3bc0]' : 'bg-[#fdefe8] text-[#b8481c]'
                                  )}
                                  title={isIncome ? 'Pemasukan' : 'Pengeluaran'}
                                >
                                  {isIncome ? <ArrowDownLeft className="size-3" /> : <ArrowUpRight className="size-3" />}
                                </span>
                                <span className="text-on-surface truncate">{row.category_name}</span>
                              </span>
                            </td>
                            <td className="text-on-surface-variant hidden max-w-[260px] truncate md:table-cell">
                              {row.sales_order_code ? (
                                <span className="text-on-surface mr-1 font-medium">{row.sales_order_code}</span>
                              ) : null}
                              {row.description || row.reference || '—'}
                            </td>
                            <td className="text-on-surface text-right font-semibold whitespace-nowrap tabular-nums">
                              {isIncome ? '+' : '−'}
                              {formatIdr(row.amount_idr)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        ) : null}
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Revenue                                                         */}
      {/* --------------------------------------------------------------- */}
      <div className="space-y-4">
        <SectionHeading
          title="Pendapatan penjualan"
          description="Order terverifikasi dalam periode, menurut pelanggan dan kemasan."
        />
        {revenue.isError ? <SectionError message={httpErrorMessage(revenue.error)} /> : null}
        <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-2">
          <Panel delay={400}>
            <PanelHeader title="Pelanggan teratas" subtitle="Berdasarkan pendapatan" />
            {loadingRevenue ? (
              <div className="bg-surface-container-low/70 h-56 animate-pulse rounded-xl" />
            ) : (
              <RankedBars
                rows={customerRows}
                color={CHART.series1}
                limit={7}
                formatOther={(t) => formatIdr(t)}
                emptyText="Belum ada order terverifikasi."
              />
            )}
          </Panel>
          <Panel delay={440}>
            <PanelHeader title="Kemasan terlaris" subtitle="Berdasarkan pendapatan · jumlah terjual" />
            {loadingRevenue ? (
              <div className="bg-surface-container-low/70 h-56 animate-pulse rounded-xl" />
            ) : (
              <RankedBars
                rows={packagingRows}
                color={CHART.series1}
                limit={7}
                formatOther={(t) => formatIdr(t)}
                emptyText="Belum ada penjualan kemasan."
              />
            )}
          </Panel>
        </div>
      </div>

      {/* --------------------------------------------------------------- */}
      {/* Production                                                      */}
      {/* --------------------------------------------------------------- */}
      <div className="space-y-4">
        <SectionHeading title="Produksi & pemakaian bahan" description="Rekap batch produksi dalam periode." />
        {production.isError ? <SectionError message={httpErrorMessage(production.error)} /> : null}

        {production.data ? (
          <div className="dash-rise border-outline-variant/60 grid grid-cols-2 divide-slate-900/[0.06] overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)] md:grid-cols-4 md:divide-x">
            {(
              [
                ['Batch produksi', production.data.summary.total_batches.toLocaleString('id-ID')],
                ['Kemasan diproduksi', fmtQty(production.data.summary.total_packages_produced)],
                ['Bonus kemasan', fmtQty(production.data.summary.total_bonus_packages)],
                ['Total output', fmtQty(production.data.summary.total_packages_output)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="px-5 py-4">
                <p className="text-on-surface-variant text-xs font-medium">{label}</p>
                <p className="text-on-surface mt-1 text-xl font-bold tracking-tight">{value}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-2">
          <Panel delay={480}>
            <PanelHeader title="Output per kemasan" subtitle="Jumlah kemasan (termasuk bonus) · estimasi nilai" />
            {loadingProduction ? (
              <div className="bg-surface-container-low/70 h-56 animate-pulse rounded-xl" />
            ) : (
              <RankedBars
                rows={outputRows}
                color={CHART.series1}
                limit={7}
                formatOther={(t) => fmtQty(t)}
                emptyText="Belum ada produksi pada periode ini."
              />
            )}
          </Panel>
          <Panel delay={520}>
            <PanelHeader title="Pemakaian bahan" subtitle="Dikelompokkan per satuan" />
            {loadingProduction ? (
              <div className="bg-surface-container-low/70 h-56 animate-pulse rounded-xl" />
            ) : usageByUnit.length === 0 ? (
              <RankedBars rows={[]} color={CHART.series2} emptyText="Belum ada pemakaian bahan." />
            ) : (
              <div className="space-y-6">
                {usageByUnit.map(([unit, rows]) => (
                  <div key={unit}>
                    {usageByUnit.length > 1 ? (
                      <p className="text-on-surface-variant mb-3 text-[11px] font-medium">Satuan {unit}</p>
                    ) : null}
                    <RankedBars
                      rows={rows}
                      color={CHART.series2}
                      limit={6}
                      formatOther={(t) => `${fmtQty(t)} ${unit}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
