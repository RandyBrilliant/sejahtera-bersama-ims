import { api } from '@/lib/api'
import type {
  AttendanceConfirmResponse,
  AttendanceIntent,
  AttendancePreviewResponse,
  AttendanceReportEnvelope,
  AttendanceSettings,
  MyAttendanceRow,
  StaffAttendanceBadgeResponse,
} from '@/types/attendance'

type Envelope<T> = { code: string; data: T; detail?: string }

export async function fetchStaffAttendanceBadge(
  userId: number
): Promise<StaffAttendanceBadgeResponse> {
  const { data } = await api.get<Envelope<StaffAttendanceBadgeResponse>>(
    `/api/attendance/admin/badges/${userId}/`
  )
  return data.data
}

export async function revokeStaffAttendanceBadge(userId: number): Promise<void> {
  await api.post(`/api/attendance/admin/badges/${userId}/revoke/`)
}

export async function unrevokeStaffAttendanceBadge(userId: number): Promise<void> {
  await api.post(`/api/attendance/admin/badges/${userId}/unrevoke/`)
}

export async function reissueStaffAttendanceBadge(
  userId: number
): Promise<StaffAttendanceBadgeResponse> {
  const { data } = await api.post<Envelope<StaffAttendanceBadgeResponse>>(
    `/api/attendance/admin/badges/${userId}/reissue/`
  )
  return data.data
}

export async function previewAttendanceScan(raw: string): Promise<AttendancePreviewResponse> {
  const { data } = await api.post<Envelope<AttendancePreviewResponse>>(
    '/api/attendance/admin/check-ins/preview/',
    { raw }
  )
  return data.data
}

export async function confirmAttendanceScan(
  raw: string,
  intent: Extract<AttendanceIntent, 'check_in' | 'check_out'>
): Promise<{ payload: AttendanceConfirmResponse; detail?: string }> {
  const { data } = await api.post<Envelope<AttendanceConfirmResponse>>(
    '/api/attendance/admin/check-ins/confirm/',
    { raw, intent }
  )
  return { payload: data.data, detail: data.detail }
}

export async function fetchAttendanceSettings(): Promise<AttendanceSettings> {
  const { data } = await api.get<Envelope<AttendanceSettings>>('/api/attendance/settings/')
  return data.data
}

export async function patchAttendanceSettings(
  patch: Partial<Pick<AttendanceSettings, 'work_start_time' | 'grace_minutes'>>
): Promise<AttendanceSettings> {
  const { data } = await api.patch<Envelope<AttendanceSettings>>('/api/attendance/settings/', patch)
  return data.data
}

export type AttendanceReportParams = {
  date_from?: string
  date_to?: string
  employee_id?: number
  page?: number
  page_size?: number
}

export async function fetchAttendanceReport(
  params: AttendanceReportParams
): Promise<AttendanceReportEnvelope> {
  const search = new URLSearchParams()
  if (params.date_from) search.set('date_from', params.date_from)
  if (params.date_to) search.set('date_to', params.date_to)
  if (params.employee_id != null) search.set('employee_id', String(params.employee_id))
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  const qs = search.toString()
  const path = qs ? `/api/attendance/reports/rows/?${qs}` : '/api/attendance/reports/rows/'
  const { data } = await api.get<Envelope<AttendanceReportEnvelope>>(path)
  return data.data
}

export type MyAttendanceParams = { date_from?: string; date_to?: string }

export async function fetchMyAttendanceRows(
  params?: MyAttendanceParams
): Promise<{ date_from: string; date_to: string; results: MyAttendanceRow[] }> {
  const search = new URLSearchParams()
  if (params?.date_from) search.set('date_from', params.date_from)
  if (params?.date_to) search.set('date_to', params.date_to)
  const qs = search.toString()
  const path = qs ? `/api/attendance/me/rows/?${qs}` : '/api/attendance/me/rows/'
  const { data } = await api.get<Envelope<{ date_from: string; date_to: string; results: MyAttendanceRow[] }>>(
    path
  )
  return data.data
}
