import type { ReactNode } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Layers, UserCheck, Users, UserX } from 'lucide-react'

import { fetchUsers } from '@/api/system-users'
import { ALL_USER_ROLES, USER_ROLE_LABEL } from '@/constants/user-roles'
import { systemUsersKeys } from '@/hooks/use-system-users-query'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types/auth'
import type { UsersListParams } from '@/types/system-user'

const COUNT_PARAMS: Pick<UsersListParams, 'page' | 'page_size'> = {
  page: 1,
  page_size: 1,
}

const ROLE_BAND_CLASS: Record<UserRole, string> = {
  ADMIN: 'bg-violet-500',
  LEADERSHIP: 'bg-amber-500',
  WAREHOUSE_STAFF: 'bg-sky-500',
  SALES_STAFF: 'bg-emerald-500',
  FINANCE_STAFF: 'bg-teal-500',
}

/** Angka utama KPI — besar dan mudah dibaca sekilas. */
const STAT_NUMBER_CLASS =
  'text-on-surface font-heading text-4xl font-bold tabular-nums tracking-tight leading-none sm:text-5xl lg:text-6xl lg:tracking-tighter'

function StatCardShell({
  label,
  icon: Icon,
  iconWrapClass,
  accentClass,
  children,
  footer,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  iconWrapClass: string
  accentClass: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div
      className={cn(
        'ambient-shadow border-outline-variant bg-surface-container-lowest group relative overflow-hidden rounded-xl border p-5 sm:p-6',
        'transition-[box-shadow,transform] duration-200 hover:shadow-md'
      )}
    >
      <div
        className={cn('pointer-events-none absolute inset-x-0 top-0 h-1 opacity-90', accentClass)}
      />
      <div className="flex items-start justify-between gap-3">
        <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </span>
        <span
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 sm:size-12',
            iconWrapClass
          )}
        >
          <Icon className="size-5 sm:size-6" />
        </span>
      </div>
      <div className="mt-5">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  )
}

function StatsLoading() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="border-outline-variant bg-surface-container-lowest h-[172px] animate-pulse rounded-xl border sm:h-[188px]"
        />
      ))}
    </div>
  )
}

export function StaffUsersStats() {
  const totalQuery = useQuery({
    queryKey: systemUsersKeys.list(COUNT_PARAMS),
    queryFn: () => fetchUsers(COUNT_PARAMS),
    staleTime: 30_000,
  })

  const activeQuery = useQuery({
    queryKey: systemUsersKeys.list({ ...COUNT_PARAMS, is_active: true }),
    queryFn: () => fetchUsers({ ...COUNT_PARAMS, is_active: true }),
    staleTime: 30_000,
  })

  const roleQueries = useQueries({
    queries: ALL_USER_ROLES.map((role) => ({
      queryKey: systemUsersKeys.list({ ...COUNT_PARAMS, role }),
      queryFn: () => fetchUsers({ ...COUNT_PARAMS, role }),
      staleTime: 30_000,
    })),
  })

  const loading =
    totalQuery.isPending ||
    activeQuery.isPending ||
    roleQueries.some((q) => q.isPending)

  if (loading) {
    return <StatsLoading />
  }

  const total = totalQuery.data?.count ?? 0
  const active = activeQuery.data?.count ?? 0
  const inactive = Math.max(0, total - active)
  const pctActive = total > 0 ? Math.round((active / total) * 100) : 0

  const roleCounts = ALL_USER_ROLES.map((_, i) => roleQueries[i]?.data?.count ?? 0)
  const rolesRepresented = roleCounts.filter((n) => n > 0).length

  const hasError = totalQuery.isError || activeQuery.isError

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardShell
          label="Total pengguna"
          icon={Users}
          iconWrapClass="bg-primary/15 text-primary"
          accentClass="bg-gradient-to-r from-primary/80 via-primary to-primary/70"
        >
          <div className={STAT_NUMBER_CLASS}>{total.toLocaleString('id-ID')}</div>
          <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
            Seluruh akun internal yang terdaftar.
          </p>
        </StatCardShell>

        <StatCardShell
          label="Aktif"
          icon={UserCheck}
          iconWrapClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          accentClass="bg-gradient-to-r from-emerald-500/90 via-emerald-500 to-emerald-600/90"
        >
          <div className={STAT_NUMBER_CLASS}>{active.toLocaleString('id-ID')}</div>
          <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
            {total > 0
              ? `${pctActive}% dari total — dapat masuk sesuai kebijakan akun.`
              : 'Dapat masuk sesuai kebijakan akun.'}
          </p>
        </StatCardShell>

        <StatCardShell
          label="Nonaktif"
          icon={UserX}
          iconWrapClass="bg-surface-container-high text-on-surface-variant"
          accentClass="bg-gradient-to-r from-outline-variant via-outline-variant/80 to-outline-variant"
        >
          <div className={STAT_NUMBER_CLASS}>{inactive.toLocaleString('id-ID')}</div>
          <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
            Tidak dapat login sampai diaktifkan lagi.
          </p>
        </StatCardShell>

        <StatCardShell
          label="Jenis peran terpakai"
          icon={Layers}
          iconWrapClass="bg-amber-500/15 text-amber-800 dark:text-amber-300"
          accentClass="bg-gradient-to-r from-amber-500/85 via-amber-500 to-amber-600/85"
          footer={
            total > 0 ? (
              <div className="space-y-2">
                <div className="bg-surface-container-high flex h-2.5 w-full overflow-hidden rounded-full shadow-inner">
                  {ALL_USER_ROLES.map((role, i) => {
                    const n = roleCounts[i] ?? 0
                    const w = total > 0 ? (n / total) * 100 : 0
                    return (
                      <div
                        key={role}
                        title={`${USER_ROLE_LABEL[role]}: ${n}`}
                        style={{ width: `${w}%` }}
                        className={cn(
                          'min-w-px transition-[width] duration-500',
                          n > 0 ? ROLE_BAND_CLASS[role] : 'bg-transparent'
                        )}
                      />
                    )
                  })}
                </div>
                <p className="text-on-surface-variant text-[11px] leading-relaxed">
                  Bilah menunjukkan proporsi tiap peran dari total pengguna (arahkan kursor untuk
                  jumlah).
                </p>
              </div>
            ) : (
              <p className="text-on-surface-variant text-xs">Belum ada data untuk distribusi.</p>
            )
          }
        >
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className={STAT_NUMBER_CLASS}>{rolesRepresented}</span>
            <span className="text-on-surface-variant text-base font-semibold md:text-lg">
              dari {ALL_USER_ROLES.length} peran
            </span>
          </div>
          <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
            Berapa banyak kategori peran yang memiliki minimal satu akun.
          </p>
        </StatCardShell>
      </div>

      {hasError ? (
        <p className="text-destructive text-sm">
          Sebagian permintaan statistik gagal; angka mungkin tidak lengkap. Muat ulang halaman atau
          periksa koneksi.
        </p>
      ) : null}
    </div>
  )
}
