import { cn } from '@/lib/utils'

export const pillSubnavNavClass =
  'border-outline-variant bg-surface-container-lowest flex flex-wrap gap-1 rounded-xl border p-1'

export function pillSubnavItemClass(active: boolean) {
  return cn(
    'rounded-lg px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-colors',
    active
      ? 'bg-primary-container text-white'
      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
  )
}
