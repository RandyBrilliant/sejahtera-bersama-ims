import { api } from '@/lib/api'
import type {
  EmployeeCompensation,
  MyPayrollSlip,
  PayrollCompensationTableRow,
  PayrollEntryRow,
  PayrollPeriod,
} from '@/types/payroll'

type Envelope<T> = { code: string; data: T; detail?: string }

export async function fetchEmployeeCompensation(userId: number): Promise<EmployeeCompensation> {
  const { data } = await api.get<Envelope<EmployeeCompensation>>(
    `/api/payroll/compensation/${userId}/`
  )
  return data.data
}

export async function fetchEmployeeCompensationTable(): Promise<PayrollCompensationTableRow[]> {
  const { data } = await api.get<Envelope<{ results: PayrollCompensationTableRow[] }>>(
    '/api/payroll/compensation/table/'
  )
  return data.data.results
}

export async function patchEmployeeCompensation(
  userId: number,
  monthly_base_salary_idr: string | number
): Promise<EmployeeCompensation> {
  const { data } = await api.patch<Envelope<EmployeeCompensation>>(`/api/payroll/compensation/${userId}/`, {
    monthly_base_salary_idr,
  })
  return data.data
}

export async function fetchMyCompensation(): Promise<EmployeeCompensation | null> {
  const { data } = await api.get<
    Envelope<EmployeeCompensation | { user_id: number; monthly_base_salary_idr: null }>
  >('/api/payroll/compensation/me/')
  const body = data.data
  if (body && typeof body === 'object' && body.monthly_base_salary_idr == null) {
    return null
  }
  return body as EmployeeCompensation
}

export async function fetchPayrollPeriod(id: number): Promise<PayrollPeriod> {
  const { data } = await api.get<Envelope<PayrollPeriod>>(`/api/payroll/periods/${id}/`)
  return data.data
}

export async function fetchPayrollPeriods(): Promise<PayrollPeriod[]> {
  const { data } = await api.get<Envelope<PayrollPeriod[]>>('/api/payroll/periods/')
  return data.data
}

export async function createPayrollPeriod(payload: {
  pay_date: string
  notes?: string
}): Promise<PayrollPeriod> {
  const { data } = await api.post<Envelope<PayrollPeriod>>('/api/payroll/periods/', payload)
  return data.data
}

export async function patchPayrollPeriodNotes(id: number, notes: string): Promise<PayrollPeriod> {
  const { data } = await api.patch<Envelope<PayrollPeriod>>(`/api/payroll/periods/${id}/`, {
    notes,
  })
  return data.data
}

export async function deletePayrollPeriod(id: number): Promise<void> {
  await api.delete(`/api/payroll/periods/${id}/`)
}

export async function generatePayrollPeriod(id: number): Promise<{
  entries_created_or_refreshed: number
  period: PayrollPeriod
}> {
  const { data } = await api.post<
    Envelope<{ entries_created_or_refreshed: number; period: PayrollPeriod }>
  >(`/api/payroll/periods/${id}/generate/`)
  return data.data
}

export async function finalizePayrollPeriod(id: number): Promise<PayrollPeriod> {
  const { data } = await api.post<Envelope<PayrollPeriod>>(`/api/payroll/periods/${id}/finalize/`)
  return data.data
}

export async function fetchPayrollEntries(periodId: number): Promise<PayrollEntryRow[]> {
  const { data } = await api.get<Envelope<PayrollEntryRow[]>>(`/api/payroll/periods/${periodId}/entries/`)
  return data.data
}

export async function patchPayrollEntry(
  periodId: number,
  entryId: number,
  patch: { deductions_idr?: string | number; notes?: string }
): Promise<PayrollEntryRow> {
  const { data } = await api.patch<Envelope<PayrollEntryRow>>(
    `/api/payroll/periods/${periodId}/entries/${entryId}/`,
    patch
  )
  return data.data
}

export async function fetchMyPayrollSlips(params?: {
  pay_date_from?: string
  pay_date_to?: string
}): Promise<{
  results: MyPayrollSlip[]
}> {
  const search = new URLSearchParams()
  if (params?.pay_date_from) search.set('pay_date_from', params.pay_date_from)
  if (params?.pay_date_to) search.set('pay_date_to', params.pay_date_to)
  const qs = search.toString()
  const path = qs ? `/api/payroll/me/entries/?${qs}` : '/api/payroll/me/entries/'
  const { data } = await api.get<Envelope<{ results: MyPayrollSlip[] }>>(path)
  return data.data
}
