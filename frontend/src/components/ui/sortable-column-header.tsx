import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'

type Props = {
  label: string
  direction: 'asc' | 'desc' | null
  onClick: () => void
  className?: string
}

export function SortableColumnHeader({ label, direction, onClick, className }: Props) {
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-on-surface-variant hover:text-on-surface -ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-left text-sm font-medium transition-colors',
        direction && 'text-on-surface',
        className
      )}
      aria-sort={
        direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'
      }
    >
      {label}
      <Icon className={cn('size-3.5 shrink-0', !direction && 'opacity-40')} aria-hidden />
    </button>
  )
}
