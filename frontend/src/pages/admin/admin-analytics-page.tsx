import { isAxiosError } from 'axios'
import { Download, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { AnalyticsCashCharts } from '@/components/admin/analytics/analytics-cash-charts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { downloadOperationalCashReportExport } from '@/api/expenses'
import { useAnalyticsReportQueries } from '@/hooks/use-analytics-report'
import { alert } from '@/lib/alert'
import {
  buildCombinedAnalyticsCsvRows,
  buildProductionRecapCsvRows,
  buildSalesRevenueCsvRows,
} from '@/lib/analytics-export-csv'
import { downloadCsv } from '@/lib/csv-download'
import { formatIdr, toFiniteNumber } from '@/lib/format-idr'
import {
  type ReportPresetId,
  REPORT_PRESET_LABELS,
  getDateRangeForPreset,
  validateDateRange,
} from '@/lib/report-presets'

const PRESET_ORDER: ReportPresetId[] = [
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'this_quarter',
  'this_year',
]

function httpErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const d = error.response?.data as { detail?: string } | undefined
    if (typeof d?.detail === 'string') return d.detail
    if (error.response?.status === 403) return 'Akses ditolak untuk bagian ini.'
  }
  return 'Gagal memuat data.'
}

function SectionError({ message }: { message: string }) {
  return (
    <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm">
      {message}
    </div>
  )
}

function KpiPlaceholder() {
  return <div className="bg-muted h-8 w-24 animate-pulse rounded-md" />
}

export function AdminAnalyticsPage() {
  const initialRange = useMemo(() => getDateRangeForPreset('last_30_days'), [])
  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)
  const [presetSelection, setPresetSelection] = useState<ReportPresetId | 'custom'>('last_30_days')

  const rangeError = validateDateRange(startDate, endDate)
  const rangeValid = rangeError === null

  const { cash, revenue, production } = useAnalyticsReportQueries(startDate, endDate, rangeValid)

  const applyPreset = useCallback((preset: ReportPresetId) => {
    const r = getDateRangeForPreset(preset)
    setPresetSelection(preset)
    setStartDate(r.start)
    setEndDate(r.end)
  }, [])

  const onStartChange = useCallback((v: string) => {
    setPresetSelection('custom')
    setStartDate(v)
  }, [])

  const onEndChange = useCallback((v: string) => {
    setPresetSelection('custom')
    setEndDate(v)
  }, [])

  const [exportKey, setExportKey] = useState<string | null>(null)

  const runExport = useCallback(async (key: string, fn: () => Promise<void>) => {
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
  }, [rangeError, rangeValid])

  const combinedCsv = useCallback(() => {
    downloadCsv(
      `analitik-gabungan-${startDate}_${endDate}.csv`,
      buildCombinedAnalyticsCsvRows(startDate, endDate, cash.data, revenue.data, production.data)
    )
  }, [cash.data, endDate, production.data, revenue.data, startDate])

  const busy = (key: string) => exportKey === key

  const refetchAll = useCallback(() => {
    void cash.refetch()
    void revenue.refetch()
    void production.refetch()
  }, [cash, revenue, production])

  const isRefetching =
    rangeValid && (cash.isFetching || revenue.isFetching || production.isFetching)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
            Analitik & laporan
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Ringkasan kas operasional, pendapatan penjualan terverifikasi, dan rekap produksi untuk
            periode yang Anda pilih. Ekspor PDF/CSV dari server untuk kas; CSV untuk Excel pada bagian
            lainnya.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          disabled={!rangeValid || isRefetching}
          onClick={() => refetchAll()}
        >
          <RefreshCw className={`size-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Muat ulang
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Rentang tanggal</CardTitle>
          <CardDescription>
            Pilih preset cepat atau tanggal kustom. Data dimuat otomatis saat rentang valid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESET_ORDER.map((id) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={presetSelection === id ? 'default' : 'outline'}
                onClick={() => applyPreset(id)}
              >
                {REPORT_PRESET_LABELS[id]}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="analytics-start">Mulai</Label>
              <Input
                id="analytics-start"
                type="date"
                value={startDate}
                onChange={(e) => onStartChange(e.target.value)}
                max={endDate}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="analytics-end">Selesai</Label>
              <Input
                id="analytics-end"
                type="date"
                value={endDate}
                onChange={(e) => onEndChange(e.target.value)}
                min={startDate}
              />
            </div>
          </div>
          {rangeError ? (
            <p className="text-destructive text-sm">{rangeError}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Periode aktif: <span className="text-foreground font-medium">{startDate}</span> —{' '}
              <span className="text-foreground font-medium">{endDate}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ekspor</CardTitle>
          <CardDescription>
            PDF dan CSV kas dihasilkan server. CSV lainnya dioptimalkan untuk Excel (UTF-8 dengan
            BOM).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!rangeValid || busy('pdf')}
            onClick={() =>
              runExport('pdf', () => downloadOperationalCashReportExport(startDate, endDate, 'pdf'))
            }
          >
            <Download className="mr-2 size-4" />
            Kas — PDF
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!rangeValid || busy('csv-kas')}
            onClick={() =>
              runExport('csv-kas', () =>
                downloadOperationalCashReportExport(startDate, endDate, 'csv')
              )
            }
          >
            Kas — CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!rangeValid || !revenue.data || busy('csv-revenue')}
            onClick={() =>
              runExport('csv-revenue', async () => {
                downloadCsv(
                  `pendapatan-${startDate}_${endDate}.csv`,
                  buildSalesRevenueCsvRows(revenue.data!)
                )
              })
            }
          >
            Pendapatan — Excel (CSV)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!rangeValid || !production.data || busy('csv-prod')}
            onClick={() =>
              runExport('csv-prod', async () => {
                downloadCsv(
                  `produksi-${startDate}_${endDate}.csv`,
                  buildProductionRecapCsvRows(production.data!)
                )
              })
            }
          >
            Produksi — Excel (CSV)
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!rangeValid || busy('csv-all')}
            onClick={() => runExport('csv-all', async () => combinedCsv())}
          >
            Gabungan — Excel (CSV)
          </Button>
        </CardContent>
      </Card>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net kas (periode)</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {cash.isPending && rangeValid ? (
                <KpiPlaceholder />
              ) : cash.isError ? (
                '—'
              ) : cash.data ? (
                formatIdr(cash.data.net_cash_idr)
              ) : (
                '—'
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendapatan terverifikasi</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {revenue.isPending && rangeValid ? (
                <KpiPlaceholder />
              ) : revenue.isError ? (
                '—'
              ) : revenue.data ? (
                formatIdr(revenue.data.summary.total_revenue_idr)
              ) : (
                '—'
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Order terverifikasi</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {revenue.isPending && rangeValid ? (
                <KpiPlaceholder />
              ) : revenue.isError ? (
                '—'
              ) : revenue.data ? (
                revenue.data.summary.verified_order_count
              ) : (
                '—'
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimasi nilai produksi</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {production.isPending && rangeValid ? (
                <KpiPlaceholder />
              ) : production.isError ? (
                '—'
              ) : production.data ? (
                formatIdr(production.data.summary.estimated_production_value_idr)
              ) : (
                '—'
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Kas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-heading text-lg font-semibold">Kas operasional</h2>
        </div>
        {cash.isError ? <SectionError message={httpErrorMessage(cash.error)} /> : null}
        {cash.data ? (
          <>
            <AnalyticsCashCharts byDay={cash.data.by_day} byCategory={cash.data.by_category} />
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tautan ke pesanan</CardTitle>
                  <CardDescription>Agregat entri kas yang terhubung ke SO / PO masuk.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody className="[&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_tr]:border-b">
                      <tr>
                        <td className="text-muted-foreground">Terhubung penjualan</td>
                        <td className="text-right tabular-nums">
                          {formatIdr(cash.data.linked_breakdown.linked_to_sales_order.total_idr)}
                        </td>
                        <td className="text-muted-foreground text-right text-xs">
                          {cash.data.linked_breakdown.linked_to_sales_order.line_count} baris
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted-foreground">Terhubung pembelian masuk</td>
                        <td className="text-right tabular-nums">
                          {formatIdr(cash.data.linked_breakdown.linked_to_purchase_in_order.total_idr)}
                        </td>
                        <td className="text-right text-xs text-muted-foreground">
                          {cash.data.linked_breakdown.linked_to_purchase_in_order.line_count} baris
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted-foreground">Tanpa tautan (masuk)</td>
                        <td className="text-right tabular-nums">
                          {formatIdr(cash.data.linked_breakdown.unlinked.income_idr)}
                        </td>
                        <td />
                      </tr>
                      <tr>
                        <td className="text-muted-foreground">Tanpa tautan (keluar)</td>
                        <td className="text-right tabular-nums">
                          {formatIdr(cash.data.linked_breakdown.unlinked.expense_idr)}
                        </td>
                        <td className="text-right text-xs text-muted-foreground">
                          {cash.data.linked_breakdown.unlinked.line_count} baris
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Entri (cuplikan)</CardTitle>
                  <CardDescription>
                    API mengembalikan hingga {cash.data.entries.returned_count} dari{' '}
                    {cash.data.entries.total_count} baris
                    {cash.data.entries.truncated ? ' — gunakan ekspor CSV untuk seluruh data.' : '.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-80 overflow-auto px-0">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left [&_th]:px-3 [&_th]:py-2">
                        <th>Tanggal</th>
                        <th>Arah</th>
                        <th>Kategori</th>
                        <th className="text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="[&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_tr]:border-b">
                      {cash.data.entries.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="whitespace-nowrap">{row.occurred_on}</td>
                          <td>{row.direction}</td>
                          <td className="max-w-[140px] truncate">{row.category_name}</td>
                          <td className="text-right tabular-nums">{formatIdr(row.amount_idr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : cash.isPending && rangeValid ? (
          <div className="bg-muted/40 h-64 animate-pulse rounded-xl" />
        ) : null}
      </section>

      <Separator />

      {/* Revenue */}
      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Pendapatan penjualan</h2>
        {revenue.isError ? <SectionError message={httpErrorMessage(revenue.error)} /> : null}
        {revenue.data ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per pelanggan</CardTitle>
              </CardHeader>
              <CardContent className="max-h-72 overflow-auto px-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left [&_th]:px-4 [&_th]:py-2">
                      <th>Pelanggan</th>
                      <th className="text-right">Order</th>
                      <th className="text-right">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:border-border [&_td]:px-4 [&_td]:py-1.5 [&_tr]:border-b">
                    {revenue.data.by_customer.map((r) => (
                      <tr key={r.customer_id}>
                        <td>{r.customer__name}</td>
                        <td className="text-right tabular-nums">{r.orders}</td>
                        <td className="text-right tabular-nums">
                          {formatIdr(toFiniteNumber(r.revenue_idr))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per kemasan produk</CardTitle>
              </CardHeader>
              <CardContent className="max-h-72 overflow-auto px-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left [&_th]:px-4 [&_th]:py-2">
                      <th>Varian</th>
                      <th>Kemasan</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:border-border [&_td]:px-4 [&_td]:py-1.5 [&_tr]:border-b">
                    {revenue.data.by_packaging.map((r) => (
                      <tr key={r.product_packaging_id}>
                        <td>{r.product_packaging__product__variant_name}</td>
                        <td className="max-w-[120px] truncate">{r.product_packaging__label}</td>
                        <td className="text-right tabular-nums">{String(r.total_quantity)}</td>
                        <td className="text-right tabular-nums">
                          {formatIdr(toFiniteNumber(r.revenue_idr))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        ) : revenue.isPending && rangeValid ? (
          <div className="bg-muted/40 h-48 animate-pulse rounded-xl" />
        ) : null}
      </section>

      <Separator />

      {/* Production */}
      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Produksi & pemakaian bahan</h2>
        {production.isError ? <SectionError message={httpErrorMessage(production.error)} /> : null}
        {production.data ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Batch produksi</CardDescription>
                  <CardTitle className="text-xl tabular-nums">
                    {production.data.summary.total_batches}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Output kemasan</CardDescription>
                  <CardTitle className="text-xl tabular-nums">
                    {String(production.data.summary.total_packages_output)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Bahan terpakai (qty)</CardDescription>
                  <CardTitle className="text-xl tabular-nums">
                    {String(production.data.summary.total_ingredients_used)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Bonus kemasan</CardDescription>
                  <CardTitle className="text-xl tabular-nums">
                    {String(production.data.summary.total_bonus_packages)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pemakaian bahan</CardTitle>
                </CardHeader>
                <CardContent className="max-h-72 overflow-auto px-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left [&_th]:px-4 [&_th]:py-2">
                        <th>Bahan</th>
                        <th>Unit</th>
                        <th className="text-right">Terpakai</th>
                      </tr>
                    </thead>
                    <tbody className="[&_td]:border-border [&_td]:px-4 [&_td]:py-1.5 [&_tr]:border-b">
                      {production.data.ingredient_usage.map((r) => (
                        <tr key={r.ingredient_inventory}>
                          <td>{r.ingredient_name}</td>
                          <td className="text-muted-foreground">{r.unit}</td>
                          <td className="text-right tabular-nums">{String(r.total_used)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Output kemasan</CardTitle>
                </CardHeader>
                <CardContent className="max-h-72 overflow-auto px-0">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr className="text-left [&_th]:px-4 [&_th]:py-2">
                        <th>Varian</th>
                        <th>Label</th>
                        <th className="text-right">Output</th>
                        <th className="text-right">Est. nilai</th>
                      </tr>
                    </thead>
                    <tbody className="[&_td]:border-border [&_td]:px-4 [&_td]:py-1.5 [&_tr]:border-b">
                      {production.data.packaging_output.map((r) => (
                        <tr key={r.product_packaging}>
                          <td>{r.variant_name}</td>
                          <td className="max-w-[100px] truncate">{r.packaging_label}</td>
                          <td className="text-right tabular-nums">{String(r.total_output)}</td>
                          <td className="text-right tabular-nums">
                            {formatIdr(toFiniteNumber(r.estimated_value_idr))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : production.isPending && rangeValid ? (
          <div className="bg-muted/40 h-48 animate-pulse rounded-xl" />
        ) : null}
      </section>
    </div>
  )
}
