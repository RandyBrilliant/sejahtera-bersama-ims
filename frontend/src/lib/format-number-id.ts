/**
 * Indonesian locale number formatting (ribuan `.`, desimal `,`), tanpa nol desimal berlebihan.
 */
export function formatDecimalId(value: string | number): string {
  const raw =
    typeof value === 'string'
      ? String(value).trim().replace(/\s/g, '').replace(',', '.')
      : value
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (Number.isNaN(n)) return String(value)
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(n)
}

export function parseDecimalLike(value: string): number {
  return Number(String(value).trim().replace(/\s/g, '').replace(',', '.'))
}

/** Σ (qty kemasan × net_mass_kg) untuk baris penjualan. */
export function salesOrderLinesTotalMassKg(
  lines: { quantity: string; net_mass_kg?: string }[]
): number {
  let total = 0
  for (const line of lines) {
    const q = parseDecimalLike(line.quantity)
    const pkgKg = parseDecimalLike(line.net_mass_kg ?? '0')
    if (Number.isFinite(q) && Number.isFinite(pkgKg)) total += q * pkgKg
  }
  return total
}

/** qty × net_mass_kg per baris penjualan (tampilan kg). */
export function formatSalesOrderLineMassKg(
  line: { quantity: string; net_mass_kg?: string }
): string {
  const kg =
    parseDecimalLike(line.quantity) * parseDecimalLike(line.net_mass_kg ?? '0')
  return Number.isFinite(kg) ? formatDecimalId(kg) : '—'
}
