/** Gabungkan path media relatif dari API Django dengan `VITE_API_URL`. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (path == null || path === '') return null

  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (!base) return null
    try {
      const resolved = new URL(path)
      const apiOrigin = new URL(base).origin
      if (resolved.origin !== apiOrigin) return null
      return path
    } catch {
      return null
    }
  }

  if (!base) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
