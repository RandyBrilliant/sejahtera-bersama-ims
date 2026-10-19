import { useCallback } from 'react'

import { confirmAttendanceScan, previewAttendanceScan } from '@/api/attendance'
import { AttendanceScanKiosk } from '@/components/admin/attendance/attendance-scan-kiosk'
import { useAuth } from '@/hooks/use-auth'
import { useGoBack } from '@/hooks/use-go-back'
import { getDashboardRouteForRole } from '@/types/auth'
import type { AttendanceIntent } from '@/types/attendance'

export function AdminAttendanceScanPage() {
  const goBack = useGoBack()
  const { user } = useAuth()
  const previewScan = useCallback((raw: string) => previewAttendanceScan(raw), [])
  const confirmScan = useCallback(
    (raw: string, intent: Extract<AttendanceIntent, 'check_in' | 'check_out'>) =>
      confirmAttendanceScan(raw, intent),
    []
  )

  return (
    <AttendanceScanKiosk
      previewScan={previewScan}
      confirmScan={confirmScan}
      onBack={() => goBack(user ? getDashboardRouteForRole(user.role) : '/admin/dashboard')}
    />
  )
}
