/** ISO 8601 → value for `<input type="datetime-local" />` (browser local timezone). */
export function isoToDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Parse `datetime-local` value to ISO string for the API. */
export function datetimeLocalValueToIso(local: string): string {
  const d = new Date(local)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

export function defaultMovementDatetimeLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
