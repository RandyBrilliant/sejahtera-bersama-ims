import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'

import { fetchOperationalCashSummary } from '@/api/expenses'
import { fetchPurchaseInOrders, fetchSalesOrders, fetchSalesRevenueReport } from '@/api/purchase'
import {
  previousRolling7DaysBlock,
  rolling7DaysThroughToday,
} from '@/lib/dashboard-ranges'
import { purchaseKeys } from '@/hooks/use-purchase-query'
import { inventoryKeys } from '@/hooks/use-inventory-query'
import { fetchIngredientInventories, fetchProductPackagingList } from '@/api/inventory'
import { systemUsersKeys } from '@/hooks/use-system-users-query'
import { fetchUsers } from '@/api/system-users'

const dashboardStaleTime = 45_000

function numIdr(v: string | number | undefined): number {
  if (v === undefined) return 0
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

export function useAdminDashboardQuery() {
  const rangeCurrent = useMemo(() => rolling7DaysThroughToday(), [])
  const rangePrev = useMemo(() => previousRolling7DaysBlock(), [])

  const orderCountQueries = useQueries({
    queries: [
      {
        queryKey: purchaseKeys.salesOrderList({ page: 1, page_size: 1 }),
        queryFn: () => fetchSalesOrders({ page: 1, page_size: 1 }),
        staleTime: dashboardStaleTime,
      },
      {
        queryKey: purchaseKeys.salesOrderList({
          page: 1,
          page_size: 1,
          status: 'VERIFIED',
        }),
        queryFn: () =>
          fetchSalesOrders({ page: 1, page_size: 1, status: 'VERIFIED' }),
        staleTime: dashboardStaleTime,
      },
      {
        queryKey: purchaseKeys.salesOrderList({
          page: 1,
          page_size: 1,
          status: 'CANCELLED',
        }),
        queryFn: () =>
          fetchSalesOrders({ page: 1, page_size: 1, status: 'CANCELLED' }),
        staleTime: dashboardStaleTime,
      },
      {
        queryKey: purchaseKeys.purchaseInList({ page: 1, page_size: 1 }),
        queryFn: () => fetchPurchaseInOrders({ page: 1, page_size: 1 }),
        staleTime: dashboardStaleTime,
      },
      {
        queryKey: purchaseKeys.purchaseInList({
          page: 1,
          page_size: 1,
          status: 'VERIFIED',
        }),
        queryFn: () =>
          fetchPurchaseInOrders({ page: 1, page_size: 1, status: 'VERIFIED' }),
        staleTime: dashboardStaleTime,
      },
      {
        queryKey: purchaseKeys.purchaseInList({
          page: 1,
          page_size: 1,
          status: 'CANCELLED',
        }),
        queryFn: () =>
          fetchPurchaseInOrders({ page: 1, page_size: 1, status: 'CANCELLED' }),
        staleTime: dashboardStaleTime,
      },
    ],
  })

  const revenueCurrent = useQuery({
    queryKey: [
      'dashboard',
      'sales-revenue',
      rangeCurrent.startDate,
      rangeCurrent.endDate,
    ],
    queryFn: () =>
      fetchSalesRevenueReport(rangeCurrent.startDate, rangeCurrent.endDate),
    staleTime: dashboardStaleTime,
  })

  const revenuePrev = useQuery({
    queryKey: ['dashboard', 'sales-revenue', rangePrev.startDate, rangePrev.endDate],
    queryFn: () => fetchSalesRevenueReport(rangePrev.startDate, rangePrev.endDate),
    staleTime: dashboardStaleTime,
  })

  const opsCashCurrent = useQuery({
    queryKey: [
      'dashboard',
      'operational-cash',
      rangeCurrent.startDate,
      rangeCurrent.endDate,
    ],
    queryFn: () =>
      fetchOperationalCashSummary(rangeCurrent.startDate, rangeCurrent.endDate),
    staleTime: dashboardStaleTime,
    retry: (failureCount, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 403 || status === 401) return false
      return failureCount < 2
    },
  })

  const opsCashPrev = useQuery({
    queryKey: [
      'dashboard',
      'operational-cash',
      rangePrev.startDate,
      rangePrev.endDate,
    ],
    queryFn: () =>
      fetchOperationalCashSummary(rangePrev.startDate, rangePrev.endDate),
    staleTime: dashboardStaleTime,
    retry: (failureCount, err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 403 || status === 401) return false
      return failureCount < 2
    },
  })

  const topPackaging = useQuery({
    queryKey: inventoryKeys.packagingList({
      page: 1,
      page_size: 8,
      ordering: '-remaining_stock',
      is_active: true,
    }),
    queryFn: () =>
      fetchProductPackagingList({
        page: 1,
        page_size: 8,
        ordering: '-remaining_stock',
        is_active: true,
      }),
    staleTime: dashboardStaleTime,
  })

  const lowIngredientStock = useQuery({
    queryKey: inventoryKeys.ingredientInventoryList({
      page: 1,
      page_size: 8,
      is_below_minimum: true,
      ordering: 'remaining_stock',
    }),
    queryFn: () =>
      fetchIngredientInventories({
        page: 1,
        page_size: 8,
        is_below_minimum: true,
        ordering: 'remaining_stock',
      }),
    staleTime: dashboardStaleTime,
  })

  const recentSales = useQuery({
    queryKey: purchaseKeys.salesOrderList({
      page: 1,
      page_size: 6,
      ordering: '-created_at',
    }),
    queryFn: () =>
      fetchSalesOrders({ page: 1, page_size: 6, ordering: '-created_at' }),
    staleTime: 30_000,
  })

  const recentPurchases = useQuery({
    queryKey: purchaseKeys.purchaseInList({
      page: 1,
      page_size: 6,
      ordering: '-created_at',
    }),
    queryFn: () =>
      fetchPurchaseInOrders({ page: 1, page_size: 6, ordering: '-created_at' }),
    staleTime: 30_000,
  })

  const usersTotal = useQuery({
    queryKey: systemUsersKeys.list({ page: 1, page_size: 1 }),
    queryFn: () => fetchUsers({ page: 1, page_size: 1 }),
    staleTime: 60_000,
  })

  const usersActive = useQuery({
    queryKey: systemUsersKeys.list({ page: 1, page_size: 1, is_active: true }),
    queryFn: () => fetchUsers({ page: 1, page_size: 1, is_active: true }),
    staleTime: 60_000,
  })

  const activeSalesOrders =
    (orderCountQueries[0].data?.count ?? 0) -
    (orderCountQueries[1].data?.count ?? 0) -
    (orderCountQueries[2].data?.count ?? 0)

  const activePurchaseOrders =
    (orderCountQueries[3].data?.count ?? 0) -
    (orderCountQueries[4].data?.count ?? 0) -
    (orderCountQueries[5].data?.count ?? 0)

  const ordersPending =
    orderCountQueries.some((q) => q.isPending) || orderCountQueries.some((q) => q.isLoading)

  const revenueNow = numIdr(revenueCurrent.data?.summary?.total_revenue_idr)
  const revenueThen = numIdr(revenuePrev.data?.summary?.total_revenue_idr)

  const expenseNow = numIdr(opsCashCurrent.data?.expense?.total_idr)
  const expenseThen = numIdr(opsCashPrev.data?.expense?.total_idr)

  return {
    rangeCurrent,
    rangePrev,
    orderCountQueries,
    activeSalesOrders,
    activePurchaseOrders,
    activeOrdersTotal: Math.max(0, activeSalesOrders) + Math.max(0, activePurchaseOrders),
    ordersPending,
    revenueCurrent,
    revenuePrev,
    revenueNow,
    revenueThen,
    opsCashCurrent,
    opsCashPrev,
    expenseNow,
    expenseThen,
    topPackaging,
    lowIngredientStock,
    recentSales,
    recentPurchases,
    usersTotal,
    usersActive,
  }
}
