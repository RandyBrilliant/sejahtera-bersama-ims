/** Tampilkan Rupiah tanpa desimal (cocok dengan harga master di backend). */
export function formatIdr(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

/** Digits-only whole rupiah for CurrencyInput (drops API `.00`). */
export function idrToDigits(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return String(Math.trunc(n))
}

/** Angka aman dari respons API (string Decimal / number). */
export function toFiniteNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(n) ? n : 0
}
