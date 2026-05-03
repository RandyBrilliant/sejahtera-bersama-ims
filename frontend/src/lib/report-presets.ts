import { endOfMonth, format, startOfMonth, startOfQuarter, startOfYear, subDays, subMonths } from 'date-fns'

/** Id preset rentang tanggal untuk laporan & analitik. */
export type ReportPresetId =
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'

export const REPORT_PRESET_LABELS: Record<ReportPresetId, string> = {
  last_7_days: '7 hari terakhir',
  last_30_days: '30 hari terakhir',
  this_month: 'Bulan ini',
  last_month: 'Bulan lalu',
  this_quarter: 'Kuartal ini',
  this_year: 'Tahun ini',
}

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/**
 * Menghitung rentang [start, end] inklusif dalam kalender lokal untuk sebuah preset.
 */
export function getDateRangeForPreset(
  preset: ReportPresetId,
  today: Date = new Date()
): { start: string; end: string } {
  const endDate = iso(today)

  switch (preset) {
    case 'last_7_days':
      return { start: iso(subDays(today, 6)), end: endDate }
    case 'last_30_days':
      return { start: iso(subDays(today, 29)), end: endDate }
    case 'this_month':
      return { start: iso(startOfMonth(today)), end: endDate }
    case 'last_month': {
      const firstThisMonth = startOfMonth(today)
      const lastMonthEnd = subMonths(firstThisMonth, 1)
      const lastMonthStart = startOfMonth(lastMonthEnd)
      const lastMonthLastDay = endOfMonth(lastMonthEnd)
      return { start: iso(lastMonthStart), end: iso(lastMonthLastDay) }
    }
    case 'this_quarter':
      return { start: iso(startOfQuarter(today)), end: endDate }
    case 'this_year':
      return { start: iso(startOfYear(today)), end: endDate }
    default: {
      const _exhaustive: never = preset
      return _exhaustive
    }
  }
}

/** Validasi rentang kustom; mengembalikan pesan error atau null jika valid. */
export function validateDateRange(start: string, end: string): string | null {
  if (!start || !end) return 'Tanggal mulai dan selesai wajib diisi.'
  if (start > end) return 'Tanggal mulai tidak boleh setelah tanggal selesai.'
  return null
}
