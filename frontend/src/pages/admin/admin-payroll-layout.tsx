import { Outlet } from 'react-router-dom'

import { PayrollSubnav } from '@/components/admin/payroll/payroll-subnav'

export function AdminPayrollLayout() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Payroll
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Kelola periode penggajian bulanan, gaji pokok karyawan, dan finalisasi slip gaji.
        </p>
      </div>

      <PayrollSubnav />

      <Outlet />
    </div>
  )
}
