export function parsePurchaseMutationError(err: unknown): string {
  const ax = err as {
    response?: { data?: { detail?: string; errors?: Record<string, unknown> } }
  }
  const d = ax.response?.data
  if (!d) return err instanceof Error ? err.message : 'Terjadi kesalahan.'
  if (typeof d.detail === 'string') return d.detail
  if (d.errors && typeof d.errors === 'object') {
    const parts: string[] = []
    for (const [k, v] of Object.entries(d.errors)) {
      const msg = Array.isArray(v) ? v[0] : String(v)
      if (msg) parts.push(`${k}: ${msg}`)
    }
    if (parts.length) return parts.join(' ')
  }
  return 'Validasi gagal.'
}
