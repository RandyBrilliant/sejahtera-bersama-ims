import { useQuery } from '@tanstack/react-query'

import { fetchAdminDashboard } from '@/api/account-dashboard'
import { rolling7DaysThroughToday, todayDateKey } from '@/lib/dashboard-ranges'

const dashboardStaleTime = 45_000

function numIdr(v: string | number | undefined): number {
  if (v === undefined) return 0
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

export const adminDashboardKeys = {
  all: ['account', 'admin-dashboard'] as const,
  snapshot: (todayKey: string) => [...adminDashboardKeys.all, todayKey] as const,
}

export function useAdminDashboardQuery() {
  const todayKey = todayDateKey()

  const query = useQuery({
    queryKey: adminDashboardKeys.snapshot(todayKey),
    queryFn: () => fetchAdminDashboard(),
    staleTime: dashboardStaleTime,
  })

  const data = query.data
  const fallbackRange = rolling7DaysThroughToday()

  return {
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    rangeCurrent: data?.range_current
      ? {
          startDate: data.range_current.start_date,
          endDate: data.range_current.end_date,
        }
      : fallbackRange,
    activeSalesOrders: data?.orders.active_sales ?? 0,
    activePurchaseOrders: data?.orders.active_purchase ?? 0,
    activeOrdersTotal: data?.orders.active_total ?? 0,
    ordersPending: query.isPending,
    revenueNow: numIdr(data?.revenue.current.summary.total_revenue_idr),
    revenueThen: numIdr(data?.revenue.previous.summary.total_revenue_idr),
    revenueError: query.isError,
    expenseNow: numIdr(data?.operational_cash.current.expense.total_idr),
    expenseThen: numIdr(data?.operational_cash.previous.expense.total_idr),
    opsCashError: query.isError,
    inventorySummary: data?.inventory_summary,
    inventoryPending: query.isPending,
    inventoryError: query.isError,
    topPackagingRows: data?.top_packaging.results ?? [],
    topPackagingPending: query.isPending,
    lowIngredientRows: data?.low_ingredient_stock.results ?? [],
    lowIngredientPending: query.isPending,
    activityRows: data?.recent_activity.results ?? [],
    activityPending: query.isPending,
    usersTotal: data?.users.total ?? 0,
    usersActive: data?.users.active ?? 0,
    usersPending: query.isPending,
  }
}
