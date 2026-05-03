import { useState } from 'react'
import { LayoutGrid, LogOut, Menu, Search, Settings, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { LogoutConfirmModal } from '@/components/auth/logout-confirm-modal'
import { AdminQuickActionsDropdown } from '@/components/dashboard/admin/admin-quick-actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

type AdminHeaderProps = {
  onMenuClick?: () => void
}

function initialsFromUser(fullName: string | undefined, username: string) {
  const n = fullName?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    const s =
      parts.length >= 2
        ? `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`
        : parts[0]!.slice(0, 2)
    return s.toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)

  const displayName = user?.full_name?.trim() || user?.username || 'Pengguna'
  const initials = user ? initialsFromUser(user.full_name, user.username) : '?'

  return (
    <>
    <header className="glass-panel border-outline-variant sticky top-0 z-40 flex w-full items-center justify-between border-b px-4 py-3 shadow-sm md:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={onMenuClick}
          className="text-on-surface rounded-md p-1.5 hover:bg-surface-container-low"
          aria-label="Buka menu"
        >
          <Menu className="size-6" />
        </button>
      </div>

      <div className="flex max-w-md flex-1 items-center">
        <div className="relative w-full transition-shadow focus-within:ring-primary focus-within:ring-2 focus-within:ring-offset-1 rounded-lg">
          <Search className="text-on-surface-variant absolute top-1/2 left-3 size-5 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Cari inventaris, pesanan..."
            className="border-outline-variant bg-surface-app placeholder:text-on-surface-variant w-full rounded-lg border py-2 pr-4 pl-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            readOnly
            aria-readonly
          />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
        <AdminQuickActionsDropdown
          align="end"
          trigger={
            <button
              type="button"
              className="text-on-surface-variant hover:bg-surface-container-low flex size-10 items-center justify-center rounded-full transition-colors"
              aria-label="Aksi cepat — pintasan transaksi harian"
            >
              <LayoutGrid className="size-5" />
            </button>
          }
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="border-outline-variant bg-primary-container text-on-primary-container ml-1 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-semibold transition-opacity hover:opacity-90"
              aria-label={`Menu pengguna: ${displayName}`}
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={cn(
              'border-outline-variant bg-surface-container-lowest text-on-surface min-w-44 border p-1 shadow-lg'
            )}
          >
            <DropdownMenuLabel className="text-on-surface truncate font-normal">
              <span className="block truncate text-sm font-semibold">{displayName}</span>
              {user?.username ? (
                <span className="text-on-surface-variant block truncate text-xs font-normal">
                  @{user.username}
                </span>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-outline-variant" />
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => {
                navigate('/admin/pengaturan')
              }}
            >
              <Settings className="size-4" />
              Pengaturan
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onSelect={() => {
                navigate('/admin/profil')
              }}
            >
              <User className="size-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer gap-2"
              onSelect={() => {
                setLogoutOpen(true)
              }}
            >
              <LogOut className="size-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  )
}
