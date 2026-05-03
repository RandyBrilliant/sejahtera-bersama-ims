/** Gabungkan path media relatif dari API Django dengan `VITE_API_URL`. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (path == null || path === '') return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  if (!base) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
