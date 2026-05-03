/**
 * Ekstrak nama berkas dari header Content-Disposition (RFC 5987 `filename*` dan `filename=`).
 */
export function parseFilenameFromContentDisposition(header: string | undefined): string | null {
  if (!header) return null

  const star = /filename\*=(?:UTF-8'')?([^;\n]+)/i.exec(header)
  if (star?.[1]) {
    const raw = star[1].trim().replace(/^"(.*)"$/, '$1')
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }

  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted?.[1]) return quoted[1].trim()

  const plain = /filename=([^;\n]+)/i.exec(header)
  return plain?.[1] ? plain[1].trim().replace(/^"(.*)"$/, '$1') : null
}
