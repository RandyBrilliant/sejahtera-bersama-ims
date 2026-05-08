import { AdminDashboardHome } from '@/components/dashboard/admin/admin-dashboard-home'
import { FinanceDashboardHome } from '@/components/dashboard/admin/finance-dashboard-home'
import { SalesDashboardHome } from '@/components/dashboard/admin/sales-dashboard-home'
import { WarehouseDashboardHome } from '@/components/dashboard/admin/warehouse-dashboard-home'
import { useAuth } from '@/hooks/use-auth'

/** Rute: `/admin/dashboard` — konten utama dasbor admin/pimpinan. */
export function AdminHomePage() {
  const { user } = useAuth()
  if (user?.role === 'WAREHOUSE_STAFF') {
    return <WarehouseDashboardHome />
  }
  if (user?.role === 'SALES_STAFF') {
    return <SalesDashboardHome />
  }
  if (user?.role === 'FINANCE_STAFF') {
    return <FinanceDashboardHome />
  }
  return <AdminDashboardHome />
}
