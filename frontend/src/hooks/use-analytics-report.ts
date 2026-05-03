import { useQuery } from '@tanstack/react-query'

import { fetchOperationalCashFullReport } from '@/api/expenses'
import { fetchInventoryRangeRecap } from '@/api/inventory'
import { fetchSalesRevenueReport } from '@/api/purchase'

const STALE_MS = 60_000

export const analyticsQueryKeys = {
  all: ['analytics'] as const,
  cash: (start: string, end: string) => [...analyticsQueryKeys.all, 'cash', start, end] as const,
  revenue: (start: string, end: string) =>
    [...analyticsQueryKeys.all, 'revenue', start, end] as const,
  production: (start: string, end: string) =>
    [...analyticsQueryKeys.all, 'production', start, end] as const,
}

/**
 * Memuat laporan kas lengkap, pendapatan terverifikasi, dan rekap produksi untuk satu rentang tanggal.
 */
export function useAnalyticsReportQueries(
  startDate: string,
  endDate: string,
  enabled: boolean
) {
  const cash = useQuery({
    queryKey: analyticsQueryKeys.cash(startDate, endDate),
    queryFn: () => fetchOperationalCashFullReport(startDate, endDate),
    enabled,
    staleTime: STALE_MS,
  })

  const revenue = useQuery({
    queryKey: analyticsQueryKeys.revenue(startDate, endDate),
    queryFn: () => fetchSalesRevenueReport(startDate, endDate),
    enabled,
    staleTime: STALE_MS,
  })

  const production = useQuery({
    queryKey: analyticsQueryKeys.production(startDate, endDate),
    queryFn: () => fetchInventoryRangeRecap(startDate, endDate),
    enabled,
    staleTime: STALE_MS,
  })

  return { cash, revenue, production }
}
