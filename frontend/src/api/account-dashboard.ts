import { api } from '@/lib/api'
import type { AdminDashboardPayload } from '@/types/account-dashboard'

type Envelope<T> = { code: string; data: T; detail?: string }

export async function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  const { data } = await api.get<Envelope<AdminDashboardPayload>>('/api/account/dashboard/admin/')
  return data.data
}
