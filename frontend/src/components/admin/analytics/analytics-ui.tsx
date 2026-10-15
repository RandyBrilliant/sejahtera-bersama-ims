import type { ReactNode } from 'react'

import { DateRangePickerInput } from '@/components/ui/date-range-picker-input'
import { REPORT_PRESET_LABELS, type ReportPresetId } from '@/lib/report-presets'
import { cn } from '@/lib/utils'

const PRESET_ORDER: ReportPresetId[] = [
  'last_7_days',
  'last_30_days',
  'this_month',
  'last_month',
  'this_quarter',
  'this_year',
]

/** One-row period filter: preset pills + custom date range. */
export function PeriodFilterBar({
  id,
  preset,
  startDate,
  endDate,
  onPreset,
  onRangeChange,
}: {
  id: string
  preset: ReportPresetId | 'custom'
  startDate: string
  endDate: string
  onPreset: (preset: ReportPresetId) => void
  onRangeChange: (value: { start: string; end: string }) => void
}) {
  return (
    <div
      className="dash-rise border-outline-variant/60 flex flex-col gap-3 rounded-2xl border bg-white p-2 shadow-[0_1px_2px_rgb(15_23_42/0.04)] lg:flex-row lg:items-center lg:justify-between"
      style={{ animationDelay: '40ms' }}
    >
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]" role="group" aria-label="Preset periode">
        {PRESET_ORDER.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={preset === p}
            onClick={() => onPreset(p)}
            className={cn(
              'h-8 shrink-0 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
              preset === p
                ? 'bg-primary text-primary-foreground'
                : 'text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-900'
            )}
          >
            {REPORT_PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 items-center gap-2 px-1 lg:px-0">
        <span className={cn('text-[12px] font-medium whitespace-nowrap', preset === 'custom' ? 'text-primary' : 'text-slate-400')}>
          Kustom
        </span>
        <div className="min-w-0 flex-1 lg:w-[280px] lg:flex-none">
          <DateRangePickerInput
            id={id}
            className="w-full min-w-0"
            startDate={startDate}
            endDate={endDate}
            onChange={onRangeChange}
            ariaLabel="Rentang tanggal kustom"
          />
        </div>
      </div>
    </div>
  )
}

export function Panel({
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
        'dash-rise border-outline-variant/60 min-w-0 rounded-2xl border bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] md:p-6',
        className
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </section>
  )
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-on-surface text-[15px] font-semibold tracking-tight">{title}</h3>
        {subtitle ? <p className="text-on-surface-variant mt-0.5 text-xs">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="dash-rise">
      <h2 className="text-on-surface text-lg font-semibold tracking-tight">{title}</h2>
      {description ? <p className="text-on-surface-variant mt-0.5 text-[13px]">{description}</p> : null}
    </div>
  )
}

export function StatTile({
  label,
  value,
  hint,
  loading,
  delay = 0,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  loading?: boolean
  delay?: number
  tone?: 'default' | 'negative'
}) {
  return (
    <Panel delay={delay} className="p-5 md:p-5">
      <p className="text-on-surface-variant text-[13px] font-medium">{label}</p>
      {loading ? (
        <div className="bg-surface-container-low mt-3 h-8 w-36 animate-pulse rounded-md" />
      ) : (
        <p
          className={cn(
            'mt-2 truncate text-[26px] leading-none font-bold tracking-[-0.02em]',
            tone === 'negative' ? 'text-red-700' : 'text-on-surface'
          )}
        >
          {value}
        </p>
      )}
      {hint && !loading ? <div className="text-on-surface-variant mt-2 truncate text-xs">{hint}</div> : null}
    </Panel>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (id: T) => void
  ariaLabel: string
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-lg bg-slate-900/[0.05] p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition-[background-color,color,box-shadow] duration-150',
            value === o.id
              ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.08)]'
              : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export type RankedRow = {
  id: string | number
  label: string
  sublabel?: string
  value: number
  display: string
  /** Optional right-aligned secondary figure (e.g. "12 order"). */
  meta?: string
}

/**
 * Ranked horizontal bars. Every row carries its value as text, so the bar is
 * reinforcement, not the only channel. Rows past `limit` fold into "Lainnya".
 */
export function RankedBars({
  rows,
  color,
  limit = 6,
  formatOther,
  emptyText = 'Tidak ada data.',
  showShare = true,
}: {
  rows: RankedRow[]
  color: string
  limit?: number
  formatOther?: (total: number) => string
  emptyText?: string
  showShare?: boolean
}) {
  const sorted = [...rows].sort((a, b) => b.value - a.value)
  const head = sorted.slice(0, limit)
  const tail = sorted.slice(limit)
  const total = sorted.reduce((s, r) => s + r.value, 0)
  const tailTotal = tail.reduce((s, r) => s + r.value, 0)
  const visible: (RankedRow & { muted?: boolean })[] =
    tail.length > 0 && formatOther
      ? [
          ...head,
          {
            id: '__other',
            label: `Lainnya (${tail.length})`,
            value: tailTotal,
            display: formatOther(tailTotal),
            muted: true,
          },
        ]
      : head
  const max = Math.max(1, ...visible.map((r) => r.value))

  if (rows.length === 0) {
    return (
      <div className="text-on-surface-variant border-outline-variant/70 flex h-40 items-center justify-center rounded-xl border border-dashed text-sm">
        {emptyText}
      </div>
    )
  }

  return (
    <ul className="space-y-3.5">
      {visible.map((r, i) => {
        const share = total > 0 ? (r.value / total) * 100 : 0
        return (
          <li key={r.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate">
                <span className={cn('font-medium', r.muted ? 'text-on-surface-variant' : 'text-on-surface')}>
                  {r.label}
                </span>
                {r.sublabel ? <span className="text-on-surface-variant"> · {r.sublabel}</span> : null}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {r.meta ? <span className="text-on-surface-variant text-[11px]">{r.meta}</span> : null}
                <span className="text-on-surface font-semibold tabular-nums">{r.display}</span>
                {showShare ? (
                  <span className="text-on-surface-variant w-10 text-right text-[11px] tabular-nums">
                    {share.toLocaleString('id-ID', { maximumFractionDigits: share < 10 ? 1 : 0 })}%
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-900/[0.05]">
              <div
                className="dash-bar-grow h-full rounded-full"
                style={{
                  width: `${Math.max((r.value / max) * 100, 1.5)}%`,
                  background: r.muted ? '#b9b6c9' : color,
                  animationDelay: `${80 + i * 50}ms`,
                }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function SectionError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</div>
  )
}
