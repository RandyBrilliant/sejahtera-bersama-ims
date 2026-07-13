import { isAxiosError } from 'axios'
import { RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePickerInput } from '@/components/ui/date-range-picker-input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useHppProfitReportQuery } from '@/hooks/use-purchase-query'
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
  return <div className="bg-muted h-8 w-28 animate-pulse rounded-md" />
}

/** One row in the P&L waterfall table. */
function PlRow({
  label,
  value,
  hint,
  tone = 'default',
  indent = false,
  strong = false,
}: {
  label: string
  value: number
  hint?: string
  tone?: 'default' | 'muted' | 'positive' | 'negative'
  indent?: boolean
  strong?: boolean
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
        ? 'text-destructive'
        : tone === 'muted'
          ? 'text-muted-foreground'
          : 'text-foreground'
  return (
    <tr className={strong ? 'bg-muted/40 font-semibold' : ''}>
      <td className={`px-4 py-2 ${indent ? 'pl-8 text-muted-foreground' : ''}`}>
        {label}
        {hint ? <span className="text-muted-foreground ml-2 text-xs">{hint}</span> : null}
      </td>
      <td className={`px-4 py-2 text-right tabular-nums ${toneClass}`}>{formatIdr(value)}</td>
    </tr>
  )
}

export function AdminHppPage() {
  const initialRange = useMemo(() => getDateRangeForPreset('this_month'), [])
  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)
  const [presetSelection, setPresetSelection] = useState<ReportPresetId | 'custom'>('this_month')

  const rangeError = validateDateRange(startDate, endDate)
  const rangeValid = rangeError === null

  const report = useHppProfitReportQuery(startDate, endDate, rangeValid)

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

  const data = report.data
  const loading = report.isPending && rangeValid
  const marginPct =
    data && data.revenue_idr > 0
      ? (data.net_profit_idr / data.revenue_idr) * 100
      : null

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
            HPP & laba
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Laba rugi berdasarkan order terverifikasi: pendapatan dikurangi HPP (biaya bahan +
            tenaga kerja produksi) menghasilkan laba kotor, dikurangi biaya operasional (OPEX)
            menghasilkan laba bersih. Khusus pemilik.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          disabled={!rangeValid || report.isFetching}
          onClick={() => void report.refetch()}
        >
          <RefreshCw className={`size-4 ${report.isFetching ? 'animate-spin' : ''}`} />
          Muat ulang
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Rentang tanggal</CardTitle>
          <CardDescription>
            Berdasarkan tanggal verifikasi order. Data dimuat otomatis saat rentang valid.
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
          <div className="max-w-md">
            <Label htmlFor="hpp-range">Rentang kustom</Label>
            <DateRangePickerInput
              id="hpp-range"
              className="mt-2"
              startDate={startDate}
              endDate={endDate}
              onChange={onRangeChange}
            />
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

      {report.isError ? <SectionError message={httpErrorMessage(report.error)} /> : null}

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendapatan</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {loading ? <KpiPlaceholder /> : data ? formatIdr(data.revenue_idr) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Laba kotor</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {loading ? <KpiPlaceholder /> : data ? formatIdr(data.gross_profit_idr) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Laba bersih {marginPct != null ? `(${marginPct.toFixed(1)}%)` : ''}</CardDescription>
            <CardTitle
              className={`text-2xl font-semibold tabular-nums ${
                data && data.net_profit_idr < 0 ? 'text-destructive' : ''
              }`}
            >
              {loading ? <KpiPlaceholder /> : data ? formatIdr(data.net_profit_idr) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>HPP / kg (rata-rata)</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {loading ? (
                <KpiPlaceholder />
              ) : data ? (
                <>
                  {formatIdr(data.hpp_per_kg_idr)}
                  <span className="text-muted-foreground ml-2 text-sm font-normal">
                    · {toFiniteNumber(data.kg_sold).toLocaleString('id-ID')} kg
                  </span>
                </>
              ) : (
                '—'
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Separator />

      {/* P&L waterfall */}
      <section className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Laba rugi (P&L)</h2>
        {data ? (
          <Card>
            <CardContent className="overflow-x-auto px-0">
              <table className="w-full text-sm">
                <tbody className="[&_tr]:border-border [&_tr]:border-b last:[&_tr]:border-0">
                  <PlRow label="Pendapatan penjualan" value={data.revenue_idr} strong />
                  <PlRow
                    label="HPP — bahan baku"
                    value={-data.cogs.material_idr}
                    indent
                    tone="muted"
                  />
                  <PlRow
                    label="HPP — tenaga kerja kupas"
                    value={-data.cogs.labor_kupas_idr}
                    indent
                    tone="muted"
                  />
                  <PlRow
                    label="HPP — upah harian produksi"
                    value={-data.cogs.labor_daily_production_idr}
                    indent
                    tone="muted"
                  />
                  <PlRow label="Total HPP" value={-data.cogs.total_idr} />
                  <PlRow
                    label="Laba kotor"
                    value={data.gross_profit_idr}
                    tone={data.gross_profit_idr < 0 ? 'negative' : 'positive'}
                    strong
                  />
                  <PlRow
                    label="OPEX — biaya operasional"
                    value={-data.opex.expenses_idr}
                    hint="di luar bahan & gaji"
                    indent
                    tone="muted"
                  />
                  <PlRow
                    label="OPEX — upah non-produksi"
                    value={-data.opex.labor_nonproduction_idr}
                    indent
                    tone="muted"
                  />
                  <PlRow label="Total OPEX" value={-data.opex.total_idr} />
                  <PlRow
                    label="Laba bersih"
                    value={data.net_profit_idr}
                    tone={data.net_profit_idr < 0 ? 'negative' : 'positive'}
                    strong
                  />
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="bg-muted/40 h-72 animate-pulse rounded-xl" />
        ) : null}
      </section>

      <Separator />

      {/* Per-variant breakdown */}
      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Per varian</h2>
          <p className="text-muted-foreground text-sm">
            COGS bahan eksak per varian; tenaga kerja produksi dialokasikan berdasarkan porsi kg.
          </p>
        </div>
        {data ? (
          data.by_variant.length > 0 ? (
            <Card>
              <CardContent className="max-h-96 overflow-auto px-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left [&_th]:px-4 [&_th]:py-2">
                      <th>Varian</th>
                      <th className="text-right">Kg</th>
                      <th className="text-right">Pendapatan</th>
                      <th className="text-right">HPP</th>
                      <th className="text-right">Laba kotor</th>
                    </tr>
                  </thead>
                  <tbody className="[&_td]:border-border [&_td]:px-4 [&_td]:py-1.5 [&_tr]:border-b">
                    {data.by_variant.map((r) => (
                      <tr key={r.product_id}>
                        <td>{r.variant_name}</td>
                        <td className="text-right tabular-nums">
                          {toFiniteNumber(r.kg).toLocaleString('id-ID')}
                        </td>
                        <td className="text-right tabular-nums">{formatIdr(r.revenue_idr)}</td>
                        <td className="text-right tabular-nums">{formatIdr(r.hpp_idr)}</td>
                        <td
                          className={`text-right tabular-nums ${
                            r.gross_profit_idr < 0 ? 'text-destructive' : 'text-emerald-600'
                          }`}
                        >
                          {formatIdr(r.gross_profit_idr)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground text-sm">
              Tidak ada penjualan terverifikasi pada periode ini.
            </p>
          )
        ) : loading ? (
          <div className="bg-muted/40 h-48 animate-pulse rounded-xl" />
        ) : null}
      </section>
    </div>
  )
}
