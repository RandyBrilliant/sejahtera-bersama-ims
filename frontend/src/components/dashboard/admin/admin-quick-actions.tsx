import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ADMIN_QUICK_ACTIONS } from '@/config/admin-quick-actions-config'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

export function AdminQuickActionsDropdown({
  trigger,
  align = 'end',
  side = 'bottom',
  sideOffset = 6,
  onNavigate,
}: {
  trigger: React.ReactNode
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'
  sideOffset?: number
  onNavigate?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="border-outline-variant bg-surface-container-lowest text-on-surface w-[min(100vw-1rem,20rem)] overflow-hidden rounded-xl border p-0 shadow-lg sm:w-80"
      >
        <div className="border-outline-variant bg-surface-container-low border-b px-3 py-2">
          <p className="text-on-surface text-sm font-semibold">Aksi cepat</p>
          <p className="text-on-surface-variant text-xs">
            Operasional harian — sama dengan ikon kotak di bilah atas.
          </p>
        </div>
        <div className="max-h-[min(70vh,28rem)] overflow-y-auto py-1">
          {ADMIN_QUICK_ACTIONS.map((item) => {
            const Icon = item.icon
            return (
              <DropdownMenuItem key={item.id} asChild className="cursor-pointer p-0 focus:bg-transparent">
                <Link
                  to={item.to}
                  className="hover:bg-accent flex items-start gap-2 rounded-none px-3 py-2.5"
                  onClick={() => onNavigate?.()}
                >
                  <Icon className="text-primary mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="text-on-surface-variant block text-xs">{item.description}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function QuickActionsCardGrid({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-2 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {ADMIN_QUICK_ACTIONS.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.id}
            to={item.to}
            className="border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low focus-visible:ring-primary/30 text-on-surface flex flex-col gap-1 rounded-xl border p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Icon className="text-primary size-5 shrink-0" />
            <span className="text-sm font-semibold">{item.label}</span>
            <span className="text-on-surface-variant text-xs">{item.description}</span>
          </Link>
        )
      })}
    </div>
  )
}
