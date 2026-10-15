import { memo, useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { CHART, compactIdr } from '@/lib/dashboard-chart'
import { formatIdr } from '@/lib/format-idr'
import type { HppProfitReportPayload } from '@/types/reports'

const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Step = {
  name: string
  full: string
  kind: 'total' | 'minus'
  /** Signed amount this step represents (deductions are negative). */
  amount: number
  range: [number, number]
}

function buildSteps(d: HppProfitReportPayload): Step[] {
  const steps: Step[] = []
  const total = (name: string, full: string, v: number) =>
    steps.push({ name, full, kind: 'total', amount: v, range: [Math.min(0, v), Math.max(0, v)] })
  let running = 0
  const minus = (name: string, full: string, cost: number) => {
    const next = running - cost
    steps.push({ name, full, kind: 'minus', amount: -cost, range: [Math.min(running, next), Math.max(running, next)] })
    running = next
  }

  running = d.revenue_idr
  total('Pendapatan', 'Pendapatan penjualan', d.revenue_idr)
  minus('Bahan baku', 'HPP — bahan baku', d.cogs.material_idr)
  minus('Kupas', 'HPP — tenaga kerja kupas', d.cogs.labor_kupas_idr)
  minus('Upah produksi', 'HPP — upah harian produksi', d.cogs.labor_daily_production_idr)
  running = d.gross_profit_idr
  total('Laba kotor', 'Laba kotor', d.gross_profit_idr)
  minus('Biaya operasional', 'OPEX — biaya operasional', d.opex.expenses_idr)
  minus('Upah non-produksi', 'OPEX — upah non-produksi', d.opex.labor_nonproduction_idr)
  total('Laba bersih', 'Laba bersih', d.net_profit_idr)
  return steps
}

/** Two-line category tick so long cost names never collide. */
function WrappedTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const words = (payload?.value ?? '').split(' ')
  const lines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : words
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={11} fill={CHART.axis}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 12 : 13}>
          {l}
        </tspan>
      ))}
    </text>
  )
}

/** Revenue → costs → profit as a floating-bar waterfall on one IDR axis. */
export const HppWaterfallChart = memo(function HppWaterfallChart({
  data,
  height = 360,
}: {
  data: HppProfitReportPayload
  height?: number
}) {
  const steps = useMemo(() => buildSteps(data), [data])
  const hasNegative = steps.some((s) => s.range[0] < 0)

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="min-w-[620px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={steps} margin={{ top: 24, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis
              dataKey="name"
              tick={<WrappedTick />}
              axisLine={{ stroke: '#d9d7e3' }}
              tickLine={false}
              interval={0}
              height={40}
            />
            <YAxis
              tickFormatter={compactIdr}
              tick={{ fontSize: 11, fill: CHART.axis }}
              width={48}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            {hasNegative ? <ReferenceLine y={0} stroke="#9a97ab" /> : null}
            <Tooltip
              cursor={{ fill: 'rgb(31 16 142 / 0.04)', radius: 8 }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const s = payload[0].payload as Step
                const pct = data.revenue_idr > 0 ? (s.amount / data.revenue_idr) * 100 : null
                return (
                  <div className="border-outline-variant/80 min-w-[200px] rounded-xl border bg-white/95 px-3.5 py-2.5 shadow-[0_8px_24px_-8px_rgb(31_16_142/0.25)] backdrop-blur">
                    <p className="text-on-surface-variant text-[11px] font-medium">{s.full}</p>
                    <p className="text-on-surface mt-1 text-sm font-semibold tabular-nums">
                      {formatIdr(s.amount)}
                    </p>
                    {pct != null ? (
                      <p className="text-on-surface-variant mt-0.5 text-[11px] tabular-nums">
                        {Math.abs(pct).toLocaleString('id-ID', { maximumFractionDigits: 1 })}% dari pendapatan
                      </p>
                    ) : null}
                  </div>
                )
              }}
            />
            <Bar
              dataKey="range"
              radius={4}
              maxBarSize={56}
              isAnimationActive={!REDUCED_MOTION}
              animationDuration={800}
            >
              {steps.map((s) => (
                <Cell key={s.name} fill={s.kind === 'total' ? CHART.series1 : CHART.series2} />
              ))}
              <LabelList
                dataKey="amount"
                position="top"
                offset={8}
                formatter={(v: number) => (v < 0 ? `−${compactIdr(Math.abs(v))}` : compactIdr(v))}
                style={{ fontSize: 11, fontWeight: 600, fill: '#464553' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
