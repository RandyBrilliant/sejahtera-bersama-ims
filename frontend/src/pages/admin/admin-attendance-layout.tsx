import { Navigate, Outlet } from 'react-router-dom'

import { AttendanceSubnav } from '@/components/admin/attendance/attendance-subnav'
import { useAuth } from '@/hooks/use-auth'

export function AdminAttendanceLayout() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Presensi
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Kelola proses check-in/check-out staf, aturan jam kerja, dan laporan kehadiran.
        </p>
      </div>

      <AttendanceSubnav />

      <Outlet />
    </div>
  )
}

export function AdminAttendanceIndexRedirect() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <Navigate
      to={user.role === 'FINANCE_STAFF' ? '/admin/absensi/laporan' : '/admin/absensi/tablet'}
      replace
    />
  )
}
