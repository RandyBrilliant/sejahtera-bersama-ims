/** Escape sel CSV (RFC 4180-style) untuk Excel / UTF-8. */
export function escapeCsvCell(value: string | number | bigint | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Gabungkan baris menjadi string CSV dengan BOM UTF-8 agar Excel membaca Unicode. */
export function rowsToCsvString(rows: (string | number | bigint | boolean | null | undefined)[][]): string {
  const lines = rows.map((row) => row.map(escapeCsvCell).join(','))
  return `\ufeff${lines.join('\r\n')}`
}

/** Picu unduhan berkas CSV di browser. */
export function downloadCsv(filename: string, rows: (string | number | boolean | null | undefined)[][]): void {
  const blob = new Blob([rowsToCsvString(rows)], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
