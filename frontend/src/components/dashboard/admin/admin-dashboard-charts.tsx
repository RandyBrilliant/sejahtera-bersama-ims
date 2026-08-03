import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { useId, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import type {
  DashboardCashDayRow,
  DashboardRevenueDayRow,
} from '@/types/account-dashboard'
import type { ProductPackaging } from '@/types/inventory'

const COMPACT = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

function compactAxis(n: number): string {
  return COMPACT.format(n)
}

function dayLabel(iso: string): string {
  try {
    return format(parseISO(iso), 'EEE', { locale: localeId })
  } catch {
    return iso.slice(5)
  }
}

function dayTitle(iso: string): string {
  try {
    return format(parseISO(iso), 'EEEE, d MMM yyyy', { locale: localeId })
  } catch {
    return iso
  }
}

const PRIMARY = '#1f108e'
const INCOME = '#0f766e'
const EXPENSE = '#b91c1c'
const MUTED_BAR = '#c4bfd9'

type TrendMode = 'revenue' | 'cash'

type DashboardTrendChartProps = {
  revenueByDay: DashboardRevenueDayRow[]
  cashByDay: DashboardCashDayRow[]
  loading?: boolean
}

export function DashboardTrendChart({
  revenueByDay,
  cashByDay,
  loading,
}: DashboardTrendChartProps) {
  const [mode, setMode] = useState<TrendMode>('revenue')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const uid = useId().replace(/:/g, '')

  const revenueData = useMemo(
    () =>
      revenueByDay.map((r) => ({
        ...r,
        label: dayLabel(r.date),
        title: dayTitle(r.date),
      })),
    [revenueByDay]
  )

  const cashData = useMemo(
    () =>
      cashByDay.map((r) => ({
        ...r,
        label: dayLabel(r.date),
        title: dayTitle(r.date),
      })),
    [cashByDay]
  )

  const empty =
    mode === 'revenue'
      ? revenueData.every((d) => d.revenue_idr === 0)
      : cashData.every((d) => d.income_idr === 0 && d.expense_idr === 0)

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-on-surface font-heading text-lg font-semibold">
            Tren 7 hari
          </h2>
          <p className="text-on-surface-variant mt-0.5 text-xs">
            {mode === 'revenue'
              ? 'Pendapatan penjualan terverifikasi per hari'
              : 'Pemasukan vs pengeluaran kas operasional'}
          </p>
        </div>
        <div
          className="bg-surface-container-low inline-flex rounded-lg p-0.5"
          role="tablist"
          aria-label="Jenis grafik"
        >
          {(
            [
              { id: 'revenue', label: 'Pendapatan' },
              { id: 'cash', label: 'Kas' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mode === tab.id}
              onClick={() => {
                setMode(tab.id)
                setActiveIndex(null)
              }}
              className={cn(
                'rounded-md px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase transition-colors',
                mode === tab.id
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-surface-container-low/60 h-[280px] animate-pulse rounded-lg" />
      ) : empty ? (
        <div className="text-on-surface-variant flex h-[280px] items-center justify-center text-sm">
          Belum ada data untuk grafik ini pada 7 hari terakhir.
        </div>
      ) : mode === 'revenue' ? (
        <div className="h-[280px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={revenueData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onMouseMove={(state) => {
                if (state?.activeTooltipIndex != null) {
                  setActiveIndex(Number(state.activeTooltipIndex))
                }
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <defs>
                <linearGradient id={`revFill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgb(31 16 142 / 0.08)"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b6b80' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={compactAxis}
                tick={{ fontSize: 11, fill: '#6b6b80' }}
                width={44}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ stroke: PRIMARY, strokeWidth: 1, strokeDasharray: '4 4' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const p = payload[0].payload as (typeof revenueData)[0]
                  return (
                    <div className="border-outline-variant bg-surface-container-lowest rounded-lg border px-3 py-2 shadow-md">
                      <p className="text-on-surface-variant text-xs capitalize">
                        {p.title}
                      </p>
                      <p className="text-on-surface mt-1 text-sm font-semibold tabular-nums">
                        {formatIdr(p.revenue_idr)}
                      </p>
                      <p className="text-on-surface-variant text-xs tabular-nums">
                        {p.order_count.toLocaleString('id-ID')} pesanan terverifikasi
                      </p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue_idr"
                stroke={PRIMARY}
                strokeWidth={2.25}
                fill={`url(#revFill-${uid})`}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: PRIMARY }}
                animationDuration={700}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
          {activeIndex != null && revenueData[activeIndex] ? (
            <p className="text-on-surface-variant mt-2 text-center text-xs tabular-nums">
              {revenueData[activeIndex].title}:{' '}
              <span className="text-on-surface font-medium">
                {formatIdr(revenueData[activeIndex].revenue_idr)}
              </span>
            </p>
          ) : (
            <p className="text-on-surface-variant mt-2 text-center text-xs">
              Arahkan kursor ke titik untuk detail harian
            </p>
          )}
        </div>
      ) : (
        <div className="h-[280px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={cashData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              barGap={2}
              onMouseMove={(state) => {
                if (state?.activeTooltipIndex != null) {
                  setActiveIndex(Number(state.activeTooltipIndex))
                }
              }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgb(31 16 142 / 0.08)"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b6b80' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={compactAxis}
                tick={{ fontSize: 11, fill: '#6b6b80' }}
                width={44}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgb(31 16 142 / 0.04)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const p = payload[0].payload as (typeof cashData)[0]
                  return (
                    <div className="border-outline-variant bg-surface-container-lowest rounded-lg border px-3 py-2 shadow-md">
                      <p className="text-on-surface-variant text-xs capitalize">
                        {p.title}
                      </p>
                      <dl className="mt-1.5 space-y-0.5 text-xs tabular-nums">
                        <div className="flex justify-between gap-6">
                          <dt className="text-on-surface-variant">Masuk</dt>
                          <dd className="font-medium" style={{ color: INCOME }}>
                            {formatIdr(p.income_idr)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-6">
                          <dt className="text-on-surface-variant">Keluar</dt>
                          <dd className="font-medium" style={{ color: EXPENSE }}>
                            {formatIdr(p.expense_idr)}
                          </dd>
                        </div>
                        <div className="border-outline-variant flex justify-between gap-6 border-t pt-1">
                          <dt className="text-on-surface-variant">Net</dt>
                          <dd
                            className={cn(
                              'font-semibold',
                              p.net_idr >= 0 ? 'text-trend-positive' : 'text-error-app'
                            )}
                          >
                            {formatIdr(p.net_idr)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="income_idr"
                name="Pemasukan"
                fill={INCOME}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                animationDuration={650}
              />
              <Bar
                dataKey="expense_idr"
                name="Pengeluaran"
                fill={EXPENSE}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                animationDuration={650}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-on-surface-variant mt-2 flex justify-center gap-4 text-[11px] font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: INCOME }} />
              Pemasukan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ background: EXPENSE }} />
              Pengeluaran
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

type PackagingStockChartProps = {
  rows: ProductPackaging[]
  loading?: boolean
}

export function PackagingStockChart({ rows, loading }: PackagingStockChartProps) {
  const [activeSku, setActiveSku] = useState<number | null>(null)

  const data = useMemo(
    () =>
      rows.slice(0, 8).map((row) => {
        const qty = Number(row.remaining_stock)
        return {
          id: row.id,
          name: row.label || row.sku,
          fullName: `${row.product_variant_name} · ${row.label}`,
          qty: Number.isNaN(qty) ? 0 : qty,
        }
      }),
    [rows]
  )

  const maxQty = Math.max(1, ...data.map((d) => d.qty))

  if (loading) {
    return <div className="bg-surface-container-low/60 h-[260px] animate-pulse rounded-lg" />
  }

  if (data.length === 0) {
    return (
      <div className="text-on-surface-variant flex h-[260px] items-center justify-center text-sm">
        Belum ada kemasan aktif.
      </div>
    )
  }

  return (
    <div className="h-[260px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          onMouseMove={(state) => {
            const idx = state?.activeTooltipIndex
            if (idx != null && data[Number(idx)]) {
              setActiveSku(data[Number(idx)].id)
            }
          }}
          onMouseLeave={() => setActiveSku(null)}
        >
          <XAxis
            type="number"
            domain={[0, maxQty]}
            tickFormatter={compactAxis}
            tick={{ fontSize: 10, fill: '#6b6b80' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fontSize: 10, fill: '#6b6b80' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgb(31 16 142 / 0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const p = payload[0].payload as (typeof data)[0]
              return (
                <div className="border-outline-variant bg-surface-container-lowest max-w-[220px] rounded-lg border px-3 py-2 shadow-md">
                  <p className="text-on-surface text-xs font-medium leading-snug">
                    {p.fullName}
                  </p>
                  <p className="text-primary mt-1 text-sm font-semibold tabular-nums">
                    {p.qty.toLocaleString('id-ID')} unit
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="qty" radius={[0, 4, 4, 0]} maxBarSize={16} animationDuration={700}>
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={
                  activeSku === entry.id || activeSku == null ? PRIMARY : MUTED_BAR
                }
                style={{ transition: 'fill 180ms ease' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
