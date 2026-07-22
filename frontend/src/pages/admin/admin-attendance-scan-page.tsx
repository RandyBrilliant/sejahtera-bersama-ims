import { useCallback } from 'react'

import { confirmAttendanceScan, previewAttendanceScan } from '@/api/attendance'
import { AttendanceScanKiosk } from '@/components/admin/attendance/attendance-scan-kiosk'
import { useGoBack } from '@/hooks/use-go-back'
import type { AttendanceIntent } from '@/types/attendance'

export function AdminAttendanceScanPage() {
  const goBack = useGoBack()
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
      onBack={() => goBack('/admin/dashboard')}
    />
  )
}
