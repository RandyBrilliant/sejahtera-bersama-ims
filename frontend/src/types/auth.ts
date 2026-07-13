export type UserRole =
  | 'ADMIN'
  | 'WAREHOUSE_STAFF'
  | 'SALES_STAFF'
  | 'FINANCE_STAFF'
  | 'KUPAS_STAFF'
  | 'LEADERSHIP'

export interface User {
  id: number
  username: string
  full_name: string
  /** Nomor kontak yang disimpan di backend (`GET /api/account/me/`). */
  phone_number?: string
  role: UserRole
  is_active: boolean
  /** ISO 8601 dari Django (`CustomUser`). */
  created_at?: string | null
  updated_at?: string | null
  /** Login terakhir yang tercatat Django (`AbstractUser.last_login`). */
  last_login?: string | null
}

export const ROLE_DASHBOARD_ROUTE: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  LEADERSHIP: '/admin/dashboard',
  WAREHOUSE_STAFF: '/admin/dashboard',
  SALES_STAFF: '/admin/dashboard',
  FINANCE_STAFF: '/admin/dashboard',
  KUPAS_STAFF: '/admin/dashboard',
}

export function getDashboardRouteForRole(role: UserRole): string {
  return ROLE_DASHBOARD_ROUTE[role]
}
