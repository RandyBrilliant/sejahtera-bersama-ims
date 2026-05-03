import { memo, useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { OperationalCashByCategoryRow, OperationalCashByDayRow } from '@/types/reports'

import { formatIdr } from '@/lib/format-idr'

const COMPACT = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

function compactAxis(n: number): string {
  return COMPACT.format(n)
}

type CashFlowChartsProps = {
  byDay: OperationalCashByDayRow[]
  byCategory: OperationalCashByCategoryRow[]
}

export const AnalyticsCashCharts = memo(function AnalyticsCashCharts({
  byDay,
  byCategory,
}: CashFlowChartsProps) {
  const categoryChartData = useMemo(() => {
    const mapped = byCategory.map((c) => ({
      label: `${c.category__name} (${c.direction})`,
      signedTotal: Number(c.total_idr),
      absTotal: Math.abs(Number(c.total_idr)),
    }))
    mapped.sort((a, b) => b.absTotal - a.absTotal)
    return mapped.slice(0, 14)
  }, [byCategory])

  const lineData = useMemo(
    () =>
      byDay.map((d) => ({
        ...d,
        label: d.occurred_on.slice(5),
      })),
    [byDay]
  )

  if (byDay.length === 0 && byCategory.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Tidak ada data kas untuk grafik pada rentang ini.
      </p>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {lineData.length > 0 ? (
        <div className="min-h-[300px] min-w-0">
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            Aliran kas harian (IDR)
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={compactAxis} tick={{ fontSize: 11 }} width={44} />
              <Tooltip
                formatter={(value: number | string, name: string) => [
                  formatIdr(typeof value === 'number' ? value : Number(value)),
                  name === 'income_idr'
                    ? 'Pemasukan'
                    : name === 'expense_idr'
                      ? 'Pengeluaran'
                      : name === 'net_idr'
                        ? 'Net'
                        : name,
                ]}
                labelFormatter={(_, items) => {
                  const p = items?.[0]?.payload as { occurred_on?: string } | undefined
                  return p?.occurred_on ?? ''
                }}
              />
              <Legend
                formatter={(value) =>
                  value === 'income_idr'
                    ? 'Pemasukan'
                    : value === 'expense_idr'
                      ? 'Pengeluaran'
                      : value === 'net_idr'
                        ? 'Net'
                        : value
                }
              />
              <Line type="monotone" dataKey="income_idr" stroke="#16a34a" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expense_idr" stroke="#dc2626" strokeWidth={2} dot={false} />
              <Line
                type="monotone"
                dataKey="net_idr"
                stroke="#2563eb"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {categoryChartData.length > 0 ? (
        <div className="min-h-[300px] min-w-0">
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            Top kategori (nilai absolut)
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              layout="vertical"
              data={categoryChartData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" horizontal={false} />
              <XAxis type="number" tickFormatter={compactAxis} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={132}
                tick={{ fontSize: 10 }}
                interval={0}
              />
              <Tooltip
                content={({ active, payload: pl }) => {
                  if (!active || !pl?.length) return null
                  const row = pl[0].payload as {
                    label: string
                    signedTotal: number
                    absTotal: number
                  }
                  return (
                    <div className="bg-popover text-popover-foreground border-border rounded-md border px-3 py-2 text-xs shadow-md">
                      <div className="max-w-[220px] font-medium leading-snug">{row.label}</div>
                      <div className="mt-1">{formatIdr(row.signedTotal)}</div>
                      <div className="text-muted-foreground">Abs: {formatIdr(row.absTotal)}</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="absTotal" fill="#6366f1" radius={[0, 4, 4, 0]} name="Absolut" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  )
})
