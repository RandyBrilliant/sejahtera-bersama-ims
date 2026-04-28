import type { UserRole } from '@/types/auth'

/** Semua peran untuk statistik ringkas (jumlah per filter). */
export const ALL_USER_ROLES: readonly UserRole[] = [
  'ADMIN',
  'LEADERSHIP',
  'WAREHOUSE_STAFF',
  'SALES_STAFF',
  'FINANCE_STAFF',
]

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  LEADERSHIP: 'Pimpinan',
  WAREHOUSE_STAFF: 'Staf gudang',
  SALES_STAFF: 'Staf penjualan',
  FINANCE_STAFF: 'Staf keuangan',
}

/** Pill/badge styling per role (tables, chips). Distinct hues for quick scanning. */
export const USER_ROLE_PILL_CLASS: Record<UserRole, string> = {
  ADMIN:
    'border-violet-500/45 bg-violet-500/[0.13] text-violet-950 dark:bg-violet-500/15 dark:text-violet-100',
  LEADERSHIP:
    'border-amber-500/45 bg-amber-500/[0.13] text-amber-950 dark:bg-amber-500/15 dark:text-amber-100',
  WAREHOUSE_STAFF:
    'border-sky-500/45 bg-sky-500/[0.13] text-sky-950 dark:bg-sky-500/15 dark:text-sky-100',
  SALES_STAFF:
    'border-emerald-500/45 bg-emerald-500/[0.13] text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-100',
  FINANCE_STAFF:
    'border-teal-500/45 bg-teal-500/[0.13] text-teal-950 dark:bg-teal-500/15 dark:text-teal-100',
}

/** Peran yang dapat dibuat/diubah oleh admin biasa (bukan owner). */
export const STAFF_AND_ADMIN_ROLES: readonly UserRole[] = [
  'ADMIN',
  'WAREHOUSE_STAFF',
  'SALES_STAFF',
  'FINANCE_STAFF',
] as const

export const OWNER_ROLE: UserRole = 'LEADERSHIP'

export function manageableRolesForActor(actorRole: UserRole): UserRole[] {
  if (actorRole === 'LEADERSHIP') {
    return ['LEADERSHIP', ...STAFF_AND_ADMIN_ROLES]
  }
  return [...STAFF_AND_ADMIN_ROLES]
}
