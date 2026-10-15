import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { memo, useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { CHART, compactIdr } from '@/lib/dashboard-chart'
import { formatIdr } from '@/lib/format-idr'
import type { OperationalCashByDayRow } from '@/types/reports'

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const AXIS_TICK = { fontSize: 11, fill: CHART.axis }

function safeFormat(iso: string, pattern: string): string {
  try {
    return format(parseISO(iso), pattern, { locale: localeId })
  } catch {
    return iso
  }
}

/** Daily income vs expense as two lines on one IDR axis; net lives in the tooltip. */
export const CashTrendChart = memo(function CashTrendChart({
  byDay,
  height = 300,
}: {
  byDay: OperationalCashByDayRow[]
  height?: number
}) {
  const data = useMemo(
    () =>
      byDay.map((d) => ({
        ...d,
        label: safeFormat(d.occurred_on, 'd MMM'),
        title: safeFormat(d.occurred_on, 'EEEE, d MMMM yyyy'),
      })),
    [byDay]
  )

  if (data.length === 0) {
    return (
      <div
        className="text-on-surface-variant border-outline-variant/70 flex items-center justify-center rounded-xl border border-dashed text-sm"
        style={{ height }}
      >
        Tidak ada transaksi kas pada rentang ini.
      </div>
    )
  }

  const showDots = data.length <= 14

  return (
    <div className="min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={{ stroke: '#d9d7e3' }}
            tickLine={false}
            tickMargin={10}
            minTickGap={24}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis
            tickFormatter={compactIdr}
            tick={AXIS_TICK}
            width={48}
            axisLine={false}
            tickLine={false}
            tickCount={5}
          />
          <Tooltip
            cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const p = payload[0].payload as (typeof data)[number]
              return (
                <div className="border-outline-variant/80 min-w-[200px] rounded-xl border bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_-8px_rgb(31_16_142/0.25)] backdrop-blur">
                  <p className="text-on-surface-variant text-[11px] font-medium capitalize">{p.title}</p>
                  <div className="mt-1.5 space-y-1 text-xs">
                    {(
                      [
                        [CHART.series1, 'Pemasukan', p.income_idr],
                        [CHART.series2, 'Pengeluaran', p.expense_idr],
                      ] as const
                    ).map(([color, label, v]) => (
                      <div key={label} className="flex items-center justify-between gap-6">
                        <span className="text-on-surface-variant inline-flex items-center gap-1.5">
                          <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />
                          {label}
                        </span>
                        <span className="text-on-surface font-semibold tabular-nums">{formatIdr(v)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-outline-variant/70 mt-2 flex items-center justify-between gap-6 border-t pt-1.5 text-xs">
                    <span className="text-on-surface-variant">Net</span>
                    <span className="text-on-surface font-semibold tabular-nums">
                      {p.net_idr > 0 ? '+' : ''}
                      {formatIdr(p.net_idr)}
                    </span>
                  </div>
                </div>
              )
            }}
          />
          {(
            [
              ['income_idr', CHART.series1],
              ['expense_idr', CHART.series2],
            ] as const
          ).map(([key, color]) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={showDots ? { r: 3, fill: color, stroke: CHART.surface, strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: color, stroke: CHART.surface, strokeWidth: 2 }}
              isAnimationActive={!REDUCED_MOTION}
              animationDuration={800}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})
