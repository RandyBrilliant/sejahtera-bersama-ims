export type EmployeeCompensation = {
  user_id: number
  username: string
  full_name: string
  monthly_base_salary_idr: string | number
  updated_at: string
}

/** Ringkas untuk tabel pengelolaan kompensasi (admin/pemilik/keuangan). */
export type PayrollCompensationTableRow = {
  user_id: number
  username: string
  full_name: string
  role: string
  employee_code: string
  monthly_base_salary_idr: string | null
  compensation_updated_at: string | null
}

export type PayrollPeriod = {
  id: number
  pay_date: string
  period_start_date: string
  period_end_date: string
  status: 'DRAFT' | 'FINALIZED'
  finalized_at: string | null
  finalized_by: number | null
  notes: string
  created_at: string
  updated_at: string
}

export type PayrollEntryRow = {
  id: number
  employee: number
  employee_name: string
  base_salary_snapshot_idr: string | number
  days_present: number
  late_count: number
  deductions_idr: string | number
  net_pay_idr: string | number
  notes: string
  created_at: string
  updated_at: string
}

export type MyPayrollSlip = {
  period_id: number
  pay_date: string
  period_start_date: string
  period_end_date: string
  base_salary_snapshot_idr: string
  days_present: number
  late_count: number
  deductions_idr: string
  net_pay_idr: string
  notes: string
  finalized_at: string | null
}
