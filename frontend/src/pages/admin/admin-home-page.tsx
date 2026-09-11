import { Navigate } from 'react-router-dom'

import { AdminDashboardHome } from '@/components/dashboard/admin/admin-dashboard-home'
import { FinanceDashboardHome } from '@/components/dashboard/admin/finance-dashboard-home'
import { SalesDashboardHome } from '@/components/dashboard/admin/sales-dashboard-home'
import { useAuth } from '@/hooks/use-auth'
import { getDashboardRouteForRole } from '@/types/auth'

/** `/admin` → home page for the signed-in role (warehouse skips the dashboard). */
export function AdminIndexRedirect() {
  const { user } = useAuth()
  if (!user) return null
  return <Navigate to={getDashboardRouteForRole(user.role)} replace />
}

/** Rute: `/admin/dashboard` — konten utama dasbor admin/pimpinan. */
export function AdminHomePage() {
  const { user } = useAuth()
  if (user?.role === 'SALES_STAFF') {
    return <SalesDashboardHome />
  }
  if (user?.role === 'FINANCE_STAFF') {
    return <FinanceDashboardHome />
  }
  return <AdminDashboardHome />
}
