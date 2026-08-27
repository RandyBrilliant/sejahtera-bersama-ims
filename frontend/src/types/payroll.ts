export type PayType = 'DAILY' | 'PIECE_RATE'
export type PayCadence = 'WEEKLY' | 'MONTHLY'

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  DAILY: 'Harian (presensi)',
  PIECE_RATE: 'Borongan kupas',
}

export const PAY_CADENCE_LABEL: Record<PayCadence, string> = {
  WEEKLY: 'Mingguan',
  MONTHLY: 'Bulanan',
}

export type EmployeeCompensation = {
  user_id: number
  username: string
  full_name: string
  pay_type: PayType
  pay_cadence: PayCadence
  daily_rate_idr: string | number
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
  pay_type: PayType
  pay_cadence: PayCadence
  daily_rate_idr: string | null
  monthly_base_salary_idr: string | null
  compensation_updated_at: string | null
}

export type KupasItem = {
  id: number
  name: string
  rate_per_kg_idr: string | number
  resulting_ingredient: number | null
  resulting_ingredient_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type KupasProductionRecord = {
  id: number
  employee: number
  employee_name: string
  work_date: string
  kupas_item: number
  kupas_item_name: string
  kg: string | number
  rate_snapshot_idr: string | number
  amount_idr: string | number
  paid_in_period: number | null
  note: string
  created_by: number | null
  created_at: string
  updated_at: string
}

export type PayrollPeriod = {
  id: number
  cadence: PayCadence
  pay_date: string
  period_start_date: string
  period_end_date: string
  status: 'DRAFT' | 'FINALIZED'
  finalized_at: string | null
  finalized_by: number | null
  notes: string
  gaji_cash_entry_id?: number | null
  created_at: string
  updated_at: string
}

export type PayrollEntryRow = {
  id: number
  employee: number
  employee_name: string
  pay_type_snapshot: PayType
  base_salary_snapshot_idr: string | number
  daily_rate_snapshot_idr: string | number
  days_present: number
  late_count: number
  total_kg: string | number
  gross_idr: string | number
  bonus_idr: string | number
  advance_deduction_idr: string | number
  deductions_idr: string | number
  net_pay_idr: string | number
  notes: string
  paid_out: boolean
  paid_out_at: string | null
  loan_item_count?: number
  created_at: string
  updated_at: string
}

export type PayrollLoanItem = {
  id: number
  amount_idr: string | number
  occurred_on: string
  payment_method: 'CASH' | 'TRANSFER'
  note: string
  cash_entry_id: number | null
  created_at: string
  updated_at: string
}

export type MyPayrollSlip = {
  period_id: number
  pay_date: string
  period_start_date: string
  period_end_date: string
  pay_type_snapshot: PayType
  base_salary_snapshot_idr: string
  daily_rate_snapshot_idr: string
  days_present: number
  late_count: number
  total_kg: string
  gross_idr: string
  bonus_idr: string
  advance_deduction_idr: string
  deductions_idr: string
  net_pay_idr: string
  notes: string
  finalized_at: string | null
}

export type PayrollSlipLine = {
  line_type: 'ATTENDANCE' | 'KUPAS' | 'SALARY'
  work_date: string
  kupas_item_name: string
  kg: string
  rate_per_kg_idr: string
  gross_idr: string
  deduction_idr: string
  is_late: boolean
  is_half_day: boolean
}

export type PayrollSlipDetail = {
  entry_id: number
  period_id: number
  pay_date: string
  period_start_date: string
  period_end_date: string
  cadence?: PayCadence
  finalized_at: string | null
  employee_id: number
  employee_name: string
  employee_username: string
  pay_type_snapshot: PayType
  daily_rate_snapshot_idr: string
  base_salary_snapshot_idr?: string
  days_present: number
  late_count: number
  total_kg: string
  gross_idr: string
  bonus_idr: string
  advance_deduction_idr: string
  deductions_idr: string
  net_pay_idr: string
  notes: string
  lines: PayrollSlipLine[]
}
