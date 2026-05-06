/**
 * API stores finished-goods mass in grams (`remaining_mass_grams`, `mass_grams`, etc.).
 * User-facing UI uses kilograms; use this helper to format those fields for display.
 */

export function formatProductMassKgFromGrams(
  gramsStr: string | number | undefined,
  maximumFractionDigits = 6
): string {
  if (gramsStr == null || gramsStr === '') return '—'
  const g = typeof gramsStr === 'string' ? Number(gramsStr) : gramsStr
  if (Number.isNaN(g)) return '—'
  const kg = g / 1000
  return kg.toLocaleString('id-ID', { maximumFractionDigits })
}
