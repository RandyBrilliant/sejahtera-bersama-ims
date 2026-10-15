import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { useId, useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { CHART, compactIdr } from '@/lib/dashboard-chart'
import { formatIdr } from '@/lib/format-idr'
import { formatProductMassKgFromGrams } from '@/lib/format-product-mass'
import type {
  DashboardCashDayRow,
  DashboardRevenueDayRow,
} from '@/types/account-dashboard'
import type { Product } from '@/types/inventory'

function dayLabel(iso: string): string {
  try {
    return format(parseISO(iso), 'EEE d', { locale: localeId })
  } catch {
    return iso.slice(5)
  }
}

function dayTitle(iso: string): string {
  try {
    return format(parseISO(iso), 'EEEE, d MMMM yyyy', { locale: localeId })
  } catch {
    return iso
  }
}

const AXIS_TICK = { fontSize: 11, fill: CHART.axis }

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="bg-surface-container-low/70 w-full animate-pulse rounded-xl"
      style={{ height }}
    />
  )
}

function ChartEmpty({ height, children }: { height: number; children: React.ReactNode }) {
  return (
    <div
      className="text-on-surface-variant border-outline-variant/70 flex w-full items-center justify-center rounded-xl border border-dashed text-sm"
      style={{ height }}
    >
      {children}
    </div>
  )
}

function TooltipCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-outline-variant/80 min-w-[180px] rounded-xl border bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_-8px_rgb(31_16_142/0.25)] backdrop-blur">
      <p className="text-on-surface-variant text-[11px] font-medium capitalize">{title}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function SwatchRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 text-xs">
      <span className="text-on-surface-variant inline-flex items-center gap-1.5">
        <span className="size-2 rounded-[3px]" style={{ background: color }} />
        {label}
      </span>
      <span className="text-on-surface font-semibold tabular-nums">{value}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Revenue — single series area with crosshair + peak label                   */
/* -------------------------------------------------------------------------- */

export function RevenueAreaChart({
  rows,
  loading,
  height = 248,
}: {
  rows: DashboardRevenueDayRow[]
  loading?: boolean
  height?: number
}) {
  const uid = useId().replace(/:/g, '')
  const data = useMemo(
    () => rows.map((r) => ({ ...r, label: dayLabel(r.date), title: dayTitle(r.date) })),
    [rows]
  )
  const peak = useMemo(
    () => data.reduce<(typeof data)[number] | null>((best, d) => (!best || d.revenue_idr > best.revenue_idr ? d : best), null),
    [data]
  )

  if (loading) return <ChartSkeleton height={height} />
  if (data.length === 0 || data.every((d) => d.revenue_idr === 0)) {
    return <ChartEmpty height={height}>Belum ada pendapatan terverifikasi minggu ini.</ChartEmpty>
  }

  return (
    <div className="min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 28, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`rev-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.series1} stopOpacity={0.16} />
              <stop offset="100%" stopColor={CHART.series1} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            interval={0}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            tickFormatter={compactIdr}
            tick={AXIS_TICK}
            width={48}
            axisLine={false}
            tickLine={false}
            tickCount={4}
          />
          <Tooltip
            cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const p = payload[0].payload as (typeof data)[number]
              return (
                <TooltipCard title={p.title}>
                  <p className="text-on-surface text-sm font-semibold tabular-nums">
                    {formatIdr(p.revenue_idr)}
                  </p>
                  <p className="text-on-surface-variant mt-0.5 text-[11px] tabular-nums">
                    {p.order_count.toLocaleString('id-ID')} pesanan terverifikasi
                  </p>
                </TooltipCard>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue_idr"
            stroke={CHART.series1}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#rev-${uid})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: CHART.surface, fill: CHART.series1 }}
            isAnimationActive={!REDUCED_MOTION}
            animationDuration={900}
            animationEasing="ease-out"
          />
          {peak && peak.revenue_idr > 0 ? (
            <ReferenceDot
              x={peak.label}
              y={peak.revenue_idr}
              r={4}
              fill={CHART.series1}
              stroke={CHART.surface}
              strokeWidth={2}
              label={{
                value: `Puncak ${compactIdr(peak.revenue_idr)}`,
                position: 'top',
                offset: 10,
                fontSize: 11,
                fontWeight: 600,
                fill: '#464553',
              }}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Cash flow — grouped columns, income vs expense                             */
/* -------------------------------------------------------------------------- */

export function CashFlowChart({
  rows,
  loading,
  height = 320,
}: {
  rows: DashboardCashDayRow[]
  loading?: boolean
  height?: number
}) {
  const data = useMemo(
    () => rows.map((r) => ({ ...r, label: dayLabel(r.date), title: dayTitle(r.date) })),
    [rows]
  )

  if (loading) return <ChartSkeleton height={height} />
  if (data.length === 0 || data.every((d) => d.income_idr === 0 && d.expense_idr === 0)) {
    return <ChartEmpty height={height}>Belum ada transaksi kas minggu ini.</ChartEmpty>
  }

  return (
    <div className="min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={{ stroke: '#d9d7e3' }}
            tickLine={false}
            tickMargin={10}
            interval={0}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            tickFormatter={compactIdr}
            tick={AXIS_TICK}
            width={48}
            axisLine={false}
            tickLine={false}
            tickCount={4}
          />
          <Tooltip
            cursor={{ fill: 'rgb(31 16 142 / 0.04)', radius: 8 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const p = payload[0].payload as (typeof data)[number]
              return (
                <TooltipCard title={p.title}>
                  <div className="space-y-1">
                    <SwatchRow color={CHART.series1} label="Pemasukan" value={formatIdr(p.income_idr)} />
                    <SwatchRow color={CHART.series2} label="Pengeluaran" value={formatIdr(p.expense_idr)} />
                  </div>
                  <div className="border-outline-variant/70 mt-2 flex items-center justify-between gap-6 border-t pt-1.5 text-xs">
                    <span className="text-on-surface-variant">Net</span>
                    <span className="text-on-surface font-semibold tabular-nums">
                      {p.net_idr >= 0 ? '+' : ''}
                      {formatIdr(p.net_idr)}
                    </span>
                  </div>
                </TooltipCard>
              )
            }}
          />
          <Bar
            dataKey="income_idr"
            name="Pemasukan"
            fill={CHART.series1}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
            isAnimationActive={!REDUCED_MOTION}
            animationDuration={700}
          />
          <Bar
            dataKey="expense_idr"
            name="Pengeluaran"
            fill={CHART.series2}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
            isAnimationActive={!REDUCED_MOTION}
            animationDuration={700}
            animationBegin={120}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Product stock — ranked horizontal bars (HTML, every value labelled)        */
/* -------------------------------------------------------------------------- */

export function ProductStockBars({ rows, loading }: { rows: Product[]; loading?: boolean }) {
  const data = useMemo(
    () =>
      rows
        .map((row) => {
          const grams = Number(row.remaining_mass_grams)
          return {
            id: row.id,
            name: row.name,
            variant: row.variant_name,
            grams: Number.isFinite(grams) ? Math.max(0, grams) : 0,
          }
        })
        .sort((a, b) => b.grams - a.grams)
        .slice(0, 6),
    [rows]
  )
  const max = Math.max(1, ...data.map((d) => d.grams))

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="bg-surface-container-low h-3 w-1/3 animate-pulse rounded" />
            <div className="bg-surface-container-low h-2 animate-pulse rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (data.length === 0) {
    return <ChartEmpty height={200}>Belum ada produk aktif.</ChartEmpty>
  }

  return (
    <ul className="space-y-4">
      {data.map((d, i) => {
        const pct = (d.grams / max) * 100
        return (
          <li key={d.id} className="group">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <p className="text-on-surface min-w-0 truncate text-[13px] font-medium">
                {d.name}
                <span className="text-on-surface-variant font-normal"> · {d.variant}</span>
              </p>
              <span className="text-on-surface shrink-0 text-[13px] font-semibold tabular-nums">
                {formatProductMassKgFromGrams(d.grams, 1)} kg
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#efedf8]">
              <div
                className="dash-bar-grow h-full rounded-full transition-[filter] duration-200 group-hover:brightness-110"
                style={{
                  width: `${Math.max(pct, 1.5)}%`,
                  background: CHART.series1,
                  animationDelay: `${120 + i * 60}ms`,
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
