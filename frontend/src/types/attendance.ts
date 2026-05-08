export type AttendanceIntent = 'check_in' | 'check_out' | 'done'

export type StaffAttendanceBadgeResponse = {
  user_id: number
  full_name: string
  employee_code: string
  badge_token: string
  is_revoked: boolean
}

export type AttendancePreviewResponse = {
  user_id: number
  username: string
  full_name: string
  role: string
  employee_code: string
  already_checked_in_today: boolean
  checked_in_at: string | null
  is_late: boolean | null
  minutes_late: number | null
  already_checked_out_today: boolean
  checked_out_at: string | null
  suggested_intent: AttendanceIntent
  badge_token: string
}

export type AttendanceConfirmResponse = {
  intent: 'check_in' | 'check_out'
  created: boolean
  employee_id: number
  work_date: string
  timezone: string
  checked_in_at?: string
  already_checked_in_today?: boolean
  is_late?: boolean
  minutes_late?: number
  verified_by_id?: number
  checked_out_at?: string | null
  verified_out_by_id?: number | null
}

export type AttendanceSettings = {
  id: number
  work_start_time: string
  grace_minutes: number
  updated_at: string
}

export type AttendanceReportRow = {
  id: number
  employee_id: number
  employee_name: string
  employee_username: string
  work_date: string
  checked_in_at: string
  verified_in_by: string
  is_late: boolean
  minutes_late: number | null
  checked_out_at: string | null
  verified_out_by: string | null
}

export type AttendanceReportEnvelope = {
  count: number
  page: number
  page_size: number
  date_from: string
  date_to: string
  results: AttendanceReportRow[]
}

export type MyAttendanceRow = {
  work_date: string
  checked_in_at: string
  is_late: boolean
  minutes_late: number | null
  checked_out_at: string | null
}
