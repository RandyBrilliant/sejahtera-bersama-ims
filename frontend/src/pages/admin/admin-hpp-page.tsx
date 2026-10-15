import { isAxiosError } from 'axios'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Lock, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import {
  Panel,
  PanelHeader,
  PeriodFilterBar,
  SectionError,
  StatTile,
} from '@/components/admin/analytics/analytics-ui'
import { HppWaterfallChart } from '@/components/admin/hpp/hpp-waterfall-chart'
import { Button } from '@/components/ui/button'
import { useHppProfitReportQuery } from '@/hooks/use-purchase-query'
import { CHART, compactIdr } from '@/lib/dashboard-chart'
import { formatIdr, toFiniteNumber } from '@/lib/format-idr'
import { type ReportPresetId, getDateRangeForPreset, validateDateRange } from '@/lib/report-presets'
import { cn } from '@/lib/utils'
import type { HppProfitReportPayload } from '@/types/reports'

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

function pctOf(value: number, base: number): number | null {
  return base > 0 ? (value / base) * 100 : null
}

function fmtPct(p: number | null): string {
  if (p == null) return '—'
  return `${p.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`
}

function fmtKg(v: string | number): string {
  return toFiniteNumber(v).toLocaleString('id-ID', { maximumFractionDigits: 1 })
}

/* -------------------------------------------------------------------------- */
/* P&L statement                                                              */
/* -------------------------------------------------------------------------- */

type StatementLine =
  | { kind: 'total'; label: string; value: number }
  | { kind: 'line'; label: string; value: number; hint?: string }
  | { kind: 'subtotal'; label: string; value: number }

function statementLines(d: HppProfitReportPayload): StatementLine[] {
  return [
    { kind: 'total', label: 'Pendapatan penjualan', value: d.revenue_idr },
    { kind: 'line', label: 'Bahan baku', value: -d.cogs.material_idr },
    { kind: 'line', label: 'Tenaga kerja kupas', value: -d.cogs.labor_kupas_idr },
    { kind: 'line', label: 'Upah harian produksi', value: -d.cogs.labor_daily_production_idr },
    { kind: 'subtotal', label: 'Total HPP', value: -d.cogs.total_idr },
    { kind: 'total', label: 'Laba kotor', value: d.gross_profit_idr },
    { kind: 'line', label: 'Biaya operasional', value: -d.opex.expenses_idr, hint: 'di luar bahan & gaji' },
    { kind: 'line', label: 'Upah non-produksi', value: -d.opex.labor_nonproduction_idr },
    { kind: 'subtotal', label: 'Total OPEX', value: -d.opex.total_idr },
    { kind: 'total', label: 'Laba bersih', value: d.net_profit_idr },
  ]
}

function PlStatement({ data }: { data: HppProfitReportPayload }) {
  const lines = statementLines(data)
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="text-on-surface-variant border-outline-variant/60 border-b text-[11px] font-medium">
          <th className="pb-2 text-left font-medium">Pos</th>
          <th className="pb-2 text-right font-medium">Nilai</th>
          <th className="w-16 pb-2 text-right font-medium">% pend.</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l) => {
          const pct = pctOf(Math.abs(l.value), data.revenue_idr)
          const isTotal = l.kind === 'total'
          const negativeTotal = isTotal && l.value < 0
          return (
            <tr
              key={l.label}
              className={cn(
                isTotal && 'border-outline-variant/60 border-t first:border-t-0',
                l.kind === 'subtotal' && 'text-on-surface-variant'
              )}
            >
              <td className={cn('py-2', l.kind === 'line' && 'text-on-surface-variant pl-4', isTotal && 'text-on-surface font-semibold')}>
                {l.label}
                {l.kind === 'line' && l.hint ? <span className="ml-1.5 text-[11px] text-slate-400">{l.hint}</span> : null}
              </td>
              <td
                className={cn(
                  'py-2 text-right whitespace-nowrap tabular-nums',
                  isTotal ? 'font-semibold' : 'text-on-surface',
                  negativeTotal ? 'text-red-700' : isTotal && 'text-on-surface',
                  l.kind === 'subtotal' && 'font-medium'
                )}
              >
                {formatIdr(l.value)}
              </td>
              <td className="text-on-surface-variant py-2 text-right text-xs tabular-nums">
                {l.label === 'Pendapatan penjualan' ? '100%' : fmtPct(pct)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

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
  const grossMargin = data ? pctOf(data.gross_profit_idr, data.revenue_idr) : null
  const netMargin = data ? pctOf(data.net_profit_idr, data.revenue_idr) : null

  const variants = useMemo(
    () =>
      [...(data?.by_variant ?? [])]
        .map((r) => {
          const kg = toFiniteNumber(r.kg)
          return {
            ...r,
            kgNum: kg,
            hppPerKg: kg > 0 ? r.hpp_idr / kg : null,
            margin: pctOf(r.gross_profit_idr, r.revenue_idr),
          }
        })
        .sort((a, b) => b.revenue_idr - a.revenue_idr),
    [data]
  )

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <header className="dash-rise flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-on-surface text-[26px] leading-tight font-bold tracking-[-0.02em] md:text-[30px]">
              HPP & laba
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              <Lock className="size-3" /> Khusus pemilik
            </span>
          </div>
          <p className="text-on-surface-variant mt-1 text-[13px]">
            Laba rugi dari order terverifikasi (menurut tanggal verifikasi)
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
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-2 self-start rounded-lg bg-white text-[13px] md:self-auto"
          disabled={!rangeValid || report.isFetching}
          onClick={() => void report.refetch()}
        >
          <RefreshCw className={cn('size-4', report.isFetching && 'animate-spin')} />
          Muat ulang
        </Button>
      </header>

      <PeriodFilterBar
        id="hpp-range"
        preset={presetSelection}
        startDate={startDate}
        endDate={endDate}
        onPreset={applyPreset}
        onRangeChange={onRangeChange}
      />
      {rangeError ? <SectionError message={rangeError} /> : null}
      {report.isError ? <SectionError message={httpErrorMessage(report.error)} /> : null}

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
        <StatTile
          label="Pendapatan"
          loading={loading}
          delay={80}
          value={data ? formatIdr(data.revenue_idr) : '—'}
          hint={
            data
              ? `${data.verified_order_count.toLocaleString('id-ID')} order · ${fmtKg(data.kg_sold)} kg terjual`
              : undefined
          }
        />
        <StatTile
          label="Laba kotor"
          loading={loading}
          delay={120}
          tone={data && data.gross_profit_idr < 0 ? 'negative' : 'default'}
          value={data ? formatIdr(data.gross_profit_idr) : '—'}
          hint={data ? `Margin kotor ${fmtPct(grossMargin)}` : undefined}
        />
        <StatTile
          label="Laba bersih"
          loading={loading}
          delay={160}
          tone={data && data.net_profit_idr < 0 ? 'negative' : 'default'}
          value={data ? formatIdr(data.net_profit_idr) : '—'}
          hint={data ? `Margin bersih ${fmtPct(netMargin)}` : undefined}
        />
        <StatTile
          label="HPP per kg"
          loading={loading}
          delay={200}
          value={data ? formatIdr(data.hpp_per_kg_idr) : '—'}
          hint={data ? `Rata-rata dari ${fmtKg(data.kg_sold)} kg` : undefined}
        />
      </div>

      {/* Waterfall + statement */}
      <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-7" delay={240}>
          <PanelHeader
            title="Dari pendapatan ke laba bersih"
            subtitle="Setiap biaya mengurangi pendapatan secara bertahap"
            action={
              <div className="text-on-surface-variant flex items-center gap-4 text-[11px] font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[3px]" style={{ background: CHART.series1 }} />
                  Total & laba
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-[3px]" style={{ background: CHART.series2 }} />
                  Biaya
                </span>
              </div>
            }
          />
          {loading ? (
            <div className="bg-surface-container-low/70 h-[360px] animate-pulse rounded-xl" />
          ) : data && data.revenue_idr > 0 ? (
            <HppWaterfallChart data={data} />
          ) : (
            <div className="text-on-surface-variant border-outline-variant/70 flex h-[360px] items-center justify-center rounded-xl border border-dashed text-sm">
              Belum ada penjualan terverifikasi pada periode ini.
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-5" delay={280}>
          <PanelHeader title="Laporan laba rugi" subtitle="Persentase terhadap pendapatan" />
          {loading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-surface-container-low h-6 animate-pulse rounded" />
              ))}
            </div>
          ) : data ? (
            <PlStatement data={data} />
          ) : null}
        </Panel>
      </div>

      {/* Per variant */}
      <Panel className="p-0 md:p-0" delay={320}>
        <div className="px-5 pt-5 md:px-6 md:pt-6">
          <PanelHeader
            title="Profitabilitas per varian"
            subtitle="HPP bahan dihitung eksak per varian; tenaga kerja produksi dialokasikan menurut porsi kg."
          />
        </div>
        {loading ? (
          <div className="space-y-2 px-6 pb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-container-low h-10 animate-pulse rounded" />
            ))}
          </div>
        ) : variants.length === 0 ? (
          <p className="text-on-surface-variant px-6 pb-6 text-sm">Tidak ada penjualan terverifikasi pada periode ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="text-on-surface-variant border-outline-variant/60 border-y bg-slate-900/[0.015] text-left text-[11px] font-medium [&_th]:px-3 [&_th]:py-2.5 [&_th:first-child]:pl-5 md:[&_th:first-child]:pl-6 [&_th:last-child]:pr-5 md:[&_th:last-child]:pr-6">
                  <th className="font-medium">Varian</th>
                  <th className="text-right font-medium">Terjual</th>
                  <th className="text-right font-medium">Pendapatan</th>
                  <th className="text-right font-medium">HPP</th>
                  <th className="text-right font-medium">HPP / kg</th>
                  <th className="text-right font-medium">Laba kotor</th>
                  <th className="w-[180px] font-medium">Margin kotor</th>
                </tr>
              </thead>
              <tbody className="divide-outline-variant/40 divide-y [&_td]:px-3 [&_td]:py-3 [&_td:first-child]:pl-5 md:[&_td:first-child]:pl-6 [&_td:last-child]:pr-5 md:[&_td:last-child]:pr-6">
                {variants.map((r, i) => {
                  const loss = r.gross_profit_idr < 0
                  const width = r.margin == null ? 0 : Math.min(100, Math.abs(r.margin))
                  return (
                    <tr key={r.product_id} className="hover:bg-slate-900/[0.02]">
                      <td className="text-on-surface font-medium">{r.variant_name}</td>
                      <td className="text-on-surface-variant text-right whitespace-nowrap tabular-nums">{fmtKg(r.kg)} kg</td>
                      <td className="text-on-surface text-right whitespace-nowrap tabular-nums">{formatIdr(r.revenue_idr)}</td>
                      <td className="text-on-surface-variant text-right whitespace-nowrap tabular-nums">{formatIdr(r.hpp_idr)}</td>
                      <td className="text-on-surface-variant text-right whitespace-nowrap tabular-nums">
                        {r.hppPerKg == null ? '—' : `Rp ${compactIdr(r.hppPerKg)}`}
                      </td>
                      <td className={cn('text-right font-semibold whitespace-nowrap tabular-nums', loss ? 'text-red-700' : 'text-on-surface')}>
                        {formatIdr(r.gross_profit_idr)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-900/[0.05]">
                            <div
                              className="dash-bar-grow h-full rounded-full"
                              style={{
                                width: `${Math.max(width, r.margin ? 2 : 0)}%`,
                                background: loss ? '#d03b3b' : CHART.series1,
                                animationDelay: `${360 + i * 50}ms`,
                              }}
                            />
                          </div>
                          <span className={cn('w-12 text-right text-xs font-semibold tabular-nums', loss ? 'text-red-700' : 'text-on-surface')}>
                            {fmtPct(r.margin)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {data && variants.length > 1 ? (
                <tfoot>
                  <tr className="border-outline-variant/60 border-t font-semibold [&_td]:px-3 [&_td]:py-3 [&_td:first-child]:pl-5 md:[&_td:first-child]:pl-6 [&_td:last-child]:pr-5 md:[&_td:last-child]:pr-6">
                    <td className="text-on-surface">Total</td>
                    <td className="text-on-surface-variant text-right tabular-nums">
                      {fmtKg(variants.reduce((s, r) => s + r.kgNum, 0))} kg
                    </td>
                    <td className="text-on-surface text-right tabular-nums">
                      {formatIdr(variants.reduce((s, r) => s + r.revenue_idr, 0))}
                    </td>
                    <td className="text-on-surface-variant text-right tabular-nums">
                      {formatIdr(variants.reduce((s, r) => s + r.hpp_idr, 0))}
                    </td>
                    <td />
                    <td className="text-on-surface text-right tabular-nums">
                      {formatIdr(variants.reduce((s, r) => s + r.gross_profit_idr, 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
