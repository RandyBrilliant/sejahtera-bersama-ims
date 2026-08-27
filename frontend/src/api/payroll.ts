import { api } from '@/lib/api'
import type {
  EmployeeCompensation,
  KupasItem,
  KupasProductionRecord,
  MyPayrollSlip,
  PayCadence,
  PayType,
  PayrollCompensationTableRow,
  PayrollEntryRow,
  PayrollLoanItem,
  PayrollPeriod,
  PayrollSlipDetail,
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
  patch: {
    pay_type?: PayType
    pay_cadence?: PayCadence
    daily_rate_idr?: string | number
    monthly_base_salary_idr?: string | number
  }
): Promise<EmployeeCompensation> {
  const { data } = await api.patch<Envelope<EmployeeCompensation>>(
    `/api/payroll/compensation/${userId}/`,
    patch
  )
  return data.data
}

export async function fetchMyCompensation(): Promise<EmployeeCompensation | null> {
  const { data } = await api.get<
    Envelope<
      | EmployeeCompensation
      | { user_id: number; pay_type: null; daily_rate_idr: null; monthly_base_salary_idr: null }
    >
  >('/api/payroll/compensation/me/')
  const body = data.data
  if (body && typeof body === 'object' && 'pay_type' in body && body.pay_type == null) {
    return null
  }
  return body as EmployeeCompensation
}

export async function fetchKupasItems(activeOnly = true): Promise<KupasItem[]> {
  const qs = activeOnly ? '?active_only=1' : '?active_only=0'
  const { data } = await api.get<Envelope<KupasItem[]>>(`/api/payroll/kupas-items${qs}`)
  return data.data
}

export async function createKupasItem(body: {
  name: string
  rate_per_kg_idr: string | number
  resulting_ingredient?: number | null
  is_active?: boolean
}): Promise<KupasItem> {
  const { data } = await api.post<Envelope<KupasItem>>('/api/payroll/kupas-items/', body)
  return data.data
}

export async function patchKupasItem(
  id: number,
  body: Partial<{
    name: string
    rate_per_kg_idr: string | number
    resulting_ingredient: number | null
    is_active: boolean
  }>
): Promise<KupasItem> {
  const { data } = await api.patch<Envelope<KupasItem>>(`/api/payroll/kupas-items/${id}/`, body)
  return data.data
}

export async function fetchKupasRecords(params?: {
  work_date?: string
  employee_id?: number
  unpaid_only?: boolean
}): Promise<KupasProductionRecord[]> {
  const search = new URLSearchParams()
  if (params?.work_date) search.set('work_date', params.work_date)
  if (params?.employee_id != null) search.set('employee_id', String(params.employee_id))
  if (params?.unpaid_only) search.set('unpaid_only', '1')
  const qs = search.toString()
  const path = qs ? `/api/payroll/kupas-records/?${qs}` : '/api/payroll/kupas-records/'
  const { data } = await api.get<Envelope<KupasProductionRecord[]>>(path)
  return data.data
}

export async function createKupasRecord(body: {
  employee: number
  work_date: string
  kupas_item: number
  kg: string | number
  note?: string
}): Promise<KupasProductionRecord> {
  const { data } = await api.post<Envelope<KupasProductionRecord>>('/api/payroll/kupas-records/', body)
  return data.data
}

export async function patchKupasRecord(
  id: number,
  body: Partial<{
    employee: number
    work_date: string
    kupas_item: number
    kg: string | number
    note: string
  }>
): Promise<KupasProductionRecord> {
  const { data } = await api.patch<Envelope<KupasProductionRecord>>(
    `/api/payroll/kupas-records/${id}/`,
    body
  )
  return data.data
}

export async function deleteKupasRecord(id: number): Promise<void> {
  await api.delete(`/api/payroll/kupas-records/${id}/`)
}

export async function fetchPayrollPeriod(id: number): Promise<PayrollPeriod> {
  const { data } = await api.get<Envelope<PayrollPeriod>>(`/api/payroll/periods/${id}/`)
  return data.data
}

export async function fetchPayrollPeriods(params?: {
  page?: number
  page_size?: number
}): Promise<{ count: number; page: number; page_size: number; results: PayrollPeriod[] }> {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.page_size != null) search.set('page_size', String(params.page_size))
  const qs = search.toString()
  const path = qs ? `/api/payroll/periods/?${qs}` : '/api/payroll/periods/'
  const { data } = await api.get<
    Envelope<{ count: number; page: number; page_size: number; results: PayrollPeriod[] }>
  >(path)
  return data.data
}

export async function createPayrollPeriod(payload: {
  cadence: PayCadence
  pay_date: string
  cutoff_date?: string
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

export async function finalizePayrollPeriod(
  id: number,
  paymentMethod: 'CASH' | 'TRANSFER' = 'CASH'
): Promise<PayrollPeriod> {
  const { data } = await api.post<Envelope<PayrollPeriod>>(`/api/payroll/periods/${id}/finalize/`, {
    payment_method: paymentMethod,
  })
  return data.data
}

export async function unfinalizePayrollPeriod(id: number): Promise<PayrollPeriod> {
  const { data } = await api.post<Envelope<PayrollPeriod>>(`/api/payroll/periods/${id}/unfinalize/`)
  return data.data
}

export async function fetchPayrollEntries(periodId: number): Promise<PayrollEntryRow[]> {
  const { data } = await api.get<Envelope<PayrollEntryRow[]>>(
    `/api/payroll/periods/${periodId}/entries/`
  )
  return data.data
}

export async function patchPayrollEntry(
  periodId: number,
  entryId: number,
  patch: {
    deductions_idr?: string | number
    bonus_idr?: string | number
    notes?: string
    paid_out?: boolean
  }
): Promise<PayrollEntryRow> {
  const { data } = await api.patch<Envelope<PayrollEntryRow>>(
    `/api/payroll/periods/${periodId}/entries/${entryId}/`,
    patch
  )
  return data.data
}

export async function fetchPayrollEntryLoans(
  periodId: number,
  entryId: number
): Promise<PayrollLoanItem[]> {
  const { data } = await api.get<Envelope<PayrollLoanItem[]>>(
    `/api/payroll/periods/${periodId}/entries/${entryId}/loans/`
  )
  return data.data
}

export async function createPayrollEntryLoan(
  periodId: number,
  entryId: number,
  body: {
    amount_idr: string | number
    occurred_on: string
    payment_method: 'CASH' | 'TRANSFER'
    note?: string
  }
): Promise<{ loan: PayrollLoanItem; entry: PayrollEntryRow }> {
  const { data } = await api.post<Envelope<{ loan: PayrollLoanItem; entry: PayrollEntryRow }>>(
    `/api/payroll/periods/${periodId}/entries/${entryId}/loans/`,
    body
  )
  return data.data
}

export async function patchPayrollEntryLoan(
  periodId: number,
  entryId: number,
  loanId: number,
  body: Partial<{
    amount_idr: string | number
    occurred_on: string
    payment_method: 'CASH' | 'TRANSFER'
    note: string
  }>
): Promise<{ loan: PayrollLoanItem; entry: PayrollEntryRow }> {
  const { data } = await api.patch<Envelope<{ loan: PayrollLoanItem; entry: PayrollEntryRow }>>(
    `/api/payroll/periods/${periodId}/entries/${entryId}/loans/${loanId}/`,
    body
  )
  return data.data
}

export async function deletePayrollEntryLoan(
  periodId: number,
  entryId: number,
  loanId: number
): Promise<PayrollEntryRow> {
  const { data } = await api.delete<Envelope<{ entry: PayrollEntryRow }>>(
    `/api/payroll/periods/${periodId}/entries/${entryId}/loans/${loanId}/`
  )
  return data.data.entry
}

export async function postPayrollPeriodToCash(
  periodId: number,
  paymentMethod: 'CASH' | 'TRANSFER'
): Promise<{ period: PayrollPeriod; cash_entry_id: number; amount_idr: number }> {
  const { data } = await api.post<
    Envelope<{ period: PayrollPeriod; cash_entry_id: number; amount_idr: number }>
  >(`/api/payroll/periods/${periodId}/post-to-cash/`, { payment_method: paymentMethod })
  return data.data
}

export async function fetchPayrollEntrySlip(
  periodId: number,
  entryId: number
): Promise<PayrollSlipDetail> {
  const { data } = await api.get<Envelope<PayrollSlipDetail>>(
    `/api/payroll/periods/${periodId}/entries/${entryId}/slip/`
  )
  return data.data
}

export async function fetchMyPayrollSlip(periodId: number): Promise<PayrollSlipDetail> {
  const { data } = await api.get<Envelope<PayrollSlipDetail>>(
    `/api/payroll/me/entries/${periodId}/slip/`
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
