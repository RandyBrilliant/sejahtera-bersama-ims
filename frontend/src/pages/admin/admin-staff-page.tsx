import { StaffUsersStats } from '@/components/admin/staff/staff-users-stats'
import { StaffUsersTable } from '@/components/admin/staff/staff-users-table'

export function AdminStaffPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Pengguna & staf
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Kelola akun internal: administrator, staf gudang, penjualan, dan keuangan. Penghapusan keras
          tidak didukung — gunakan nonaktifasi.
        </p>
      </div>

      <StaffUsersStats />

      <StaffUsersTable />
    </div>
  )
}
