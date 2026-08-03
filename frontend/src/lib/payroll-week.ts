/** Format & helpers for weekly/monthly payroll periods. */

import type { PayCadence } from '@/types/payroll'

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

/** Last day of the month containing `from`. */
export function endOfMonth(from = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth() + 1, 0)
}

/** First day of the month containing `from`. */
export function startOfMonth(from = new Date()): Date {
  return new Date(from.getFullYear(), from.getMonth(), 1)
}

/** Default period bounds preview for create UI. */
export function previewPeriodBounds(
  payDateIso: string,
  cadence: PayCadence,
  cutoffIso?: string
): { start: string; end: string } | null {
  try {
    const pay = parseIsoDateOnly(payDateIso)
    if (cadence === 'MONTHLY') {
      if (cutoffIso) {
        const end = parseIsoDateOnly(cutoffIso)
        const start = startOfMonth(end)
        return { start: toIsoDateOnly(start), end: toIsoDateOnly(end) }
      }
      const start = startOfMonth(pay)
      const end = endOfMonth(pay)
      return { start: toIsoDateOnly(start), end: toIsoDateOnly(end) }
    }
    const end = cutoffIso ? parseIsoDateOnly(cutoffIso) : pay
    const start = new Date(end)
    start.setDate(start.getDate() - 6) // Sunday–Saturday
    return { start: toIsoDateOnly(start), end: toIsoDateOnly(end) }
  } catch {
    return null
  }
}

export function formatPayrollWeekLabel(
  payDateIso: string,
  periodStartIso?: string,
  periodEndIso?: string,
  cadence?: PayCadence
): string {
  const pay = parseIsoDateOnly(payDateIso)
  const payLabel = pay.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const cadenceTag =
    cadence === 'MONTHLY' ? 'bulanan' : cadence === 'WEEKLY' ? 'mingguan' : null
  if (periodStartIso && periodEndIso) {
    const start = parseIsoDateOnly(periodStartIso)
    const end = parseIsoDateOnly(periodEndIso)
    const range = `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
    const suffix = cadenceTag ? ` · ${cadenceTag}` : ''
    return `${range} (bayar ${payLabel})${suffix}`
  }
  const suffix = cadenceTag ? ` · ${cadenceTag}` : ''
  return `Bayar ${payLabel}${suffix}`
}
