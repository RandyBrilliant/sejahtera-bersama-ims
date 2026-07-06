/** Tampilkan kg tanpa nol desimal di belakang (28.000 → 28, 28.5 tetap 28.5). */
export function formatKg(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const s = String(value).trim()
  if (!s) return ''
  if (!s.includes('.')) return s
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

/** Jumlah kg untuk tampilan ringkasan (dengan satuan opsional). */
export function formatKgAmount(value: string | number | null | undefined, withUnit = false): string {
  const formatted = formatKg(value)
  if (!formatted) return withUnit ? '0 kg' : '0'
  return withUnit ? `${formatted} kg` : formatted
}
