import { format, parseISO, subDays } from 'date-fns'

/** Rentang 7 hari berakhir hari ini (inklusif): dari (hari_ini − 6) s/d hari_ini. */
export function rolling7DaysThroughToday(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = subDays(end, 6)
  return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') }
}

/** 7 hari sebelum rentang "rolling7DaysThroughToday" (untuk perbandingan tren). */
export function previousRolling7DaysBlock(): { startDate: string; endDate: string } {
  const end = subDays(new Date(), 7)
  const start = subDays(end, 6)
  return { startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') }
}

export function formatRangeSubtitle(start: string, end: string): string {
  if (start === end) return format(parseISO(start), 'd MMM yyyy')
  return `${format(parseISO(start), 'd MMM')} – ${format(parseISO(end), 'd MMM yyyy')}`
}
