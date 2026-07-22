import { useCallback } from 'react'

import {
  confirmPublicAttendanceScan,
  previewPublicAttendanceScan,
} from '@/api/attendance'
import { AttendanceScanKiosk } from '@/components/admin/attendance/attendance-scan-kiosk'
import type { AttendanceIntent } from '@/types/attendance'

/**
 * Public fullscreen QR kiosk — no login required.
 * Open on a tablet at the entrance; camera starts automatically.
 */
export function PublicAttendanceKioskPage() {
  const previewScan = useCallback((raw: string) => previewPublicAttendanceScan(raw), [])
  const confirmScan = useCallback(
    (raw: string, intent: Extract<AttendanceIntent, 'check_in' | 'check_out'>) =>
      confirmPublicAttendanceScan(raw, intent),
    []
  )

  return (
    <AttendanceScanKiosk
      previewScan={previewScan}
      confirmScan={confirmScan}
      titleHint="Presensi staf — arahkan kartu ke kamera"
    />
  )
}
