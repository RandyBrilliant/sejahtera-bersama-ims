/** Format ISO date (`YYYY-MM-DD`) untuk tampilan `dd/MM/yyyy`. */
export function formatAuditDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const datePart = iso.slice(0, 10)
  const [year, month, day] = datePart.split('-')
  if (!year || !month || !day) return iso
  return `${day}/${month}/${year}`
}

/** Format ISO datetime dari backend untuk audit: `dd/MM/yyyy HH:mm` (zona Asia/Jakarta, jam 24 jam). */
export function formatAuditDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d)

    const pick = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? ''

    const day = pick('day')
    const month = pick('month')
    const year = pick('year')
    const hour = pick('hour')
    const minute = pick('minute')

    return `${day}/${month}/${year} ${hour}:${minute}`
  } catch {
    return iso
  }
}
