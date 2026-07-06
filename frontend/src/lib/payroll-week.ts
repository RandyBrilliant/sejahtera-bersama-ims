/** Format & helpers for weekly payroll (paid every Saturday). */

export function parseIsoDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function toIsoDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isSaturday(d: Date): boolean {
  return d.getDay() === 6
}

/** Next Saturday on or after `from` (including today if Saturday). */
export function upcomingPaySaturday(from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const daysAhead = (6 - d.getDay() + 7) % 7
  d.setDate(d.getDate() + daysAhead)
  return d
}

export function formatPayrollWeekLabel(
  payDateIso: string,
  periodStartIso?: string,
  periodEndIso?: string
): string {
  const pay = parseIsoDateOnly(payDateIso)
  const payLabel = pay.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  if (periodStartIso && periodEndIso) {
    const start = parseIsoDateOnly(periodStartIso)
    const end = parseIsoDateOnly(periodEndIso)
    const range = `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
    return `${range} (bayar ${payLabel})`
  }
  return `Bayar ${payLabel}`
}
