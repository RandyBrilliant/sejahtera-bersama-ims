import { api } from '@/lib/api'
import type {
  OperationalCashEntry,
  OperationalCashEntryCreateInput,
  OperationalCashEntryListParams,
  OperationalCashEntryUpdateInput,
  OperationalCategory,
  OperationalCategoryCreateInput,
  OperationalCategoryListParams,
  OperationalCategoryUpdateInput,
  Paginated,
} from '@/types/expenses'
import type {
  OperationalCashEnvelope,
  OperationalCashFullEnvelope,
  OperationalCashFullReportPayload,
  OperationalCashSummaryPayload,
} from '@/types/reports'
import { downloadBlob } from '@/lib/csv-download'
import { parseFilenameFromContentDisposition } from '@/lib/http-filename'

function buildCategoryQuery(params: OperationalCategoryListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.entry_kind) search.set('entry_kind', params.entry_kind)
  if (params.is_active !== undefined) search.set('is_active', String(params.is_active))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function buildEntryQuery(params: OperationalCashEntryListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.direction) search.set('direction', params.direction)
  if (params.category != null) search.set('category', String(params.category))
  if (params.occurred_on_from) search.set('occurred_on_from', params.occurred_on_from)
  if (params.occurred_on_to) search.set('occurred_on_to', params.occurred_on_to)
  if (params.sales_order != null) search.set('sales_order', String(params.sales_order))
  if (params.purchase_in_order != null) {
    search.set('purchase_in_order', String(params.purchase_in_order))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchOperationalCashSummary(
  startDate: string,
  endDate: string
): Promise<OperationalCashSummaryPayload> {
  const { data } = await api.get<OperationalCashEnvelope>('/api/expenses/summary/', {
    params: { start_date: startDate, end_date: endDate },
  })
  return data.data
}

export async function fetchOperationalCashFullReport(
  startDate: string,
  endDate: string
): Promise<OperationalCashFullReportPayload> {
  const { data } = await api.get<OperationalCashFullEnvelope>('/api/expenses/report/', {
    params: { start_date: startDate, end_date: endDate, export: 'json' },
  })
  return data.data
}

/**
 * Unduh laporan kas dari server (CSV atau PDF). Nama berkas mengikuti Content-Disposition.
 */
export async function downloadOperationalCashReportExport(
  startDate: string,
  endDate: string,
  format: 'csv' | 'pdf'
): Promise<void> {
  const response = await api.get<Blob>('/api/expenses/report/', {
    params: { start_date: startDate, end_date: endDate, export: format },
    responseType: 'blob',
  })
  const cd = response.headers['content-disposition'] as string | undefined
  const fallback =
    format === 'pdf'
      ? `operational-cash-${startDate}_${endDate}.pdf`
      : `operational-cash-${startDate}_${endDate}.csv`
  const filename = parseFilenameFromContentDisposition(cd) ?? fallback
  downloadBlob(response.data, filename)
}

export async function fetchOperationalCategories(
  params: OperationalCategoryListParams
): Promise<Paginated<OperationalCategory>> {
  const { data } = await api.get<Paginated<OperationalCategory>>(
    `/api/expenses/categories/${buildCategoryQuery(params)}`
  )
  return data
}

export async function fetchOperationalCategory(id: number): Promise<OperationalCategory> {
  const { data } = await api.get<OperationalCategory>(`/api/expenses/categories/${id}/`)
  return data
}

export async function createOperationalCategory(
  body: OperationalCategoryCreateInput
): Promise<OperationalCategory> {
  const { data } = await api.post<OperationalCategory>('/api/expenses/categories/', body)
  return data
}

export async function updateOperationalCategory(
  id: number,
  body: OperationalCategoryUpdateInput
): Promise<OperationalCategory> {
  const { data } = await api.patch<OperationalCategory>(`/api/expenses/categories/${id}/`, body)
  return data
}

export async function deleteOperationalCategory(id: number): Promise<void> {
  await api.delete(`/api/expenses/categories/${id}/`)
}

export async function fetchOperationalCashEntries(
  params: OperationalCashEntryListParams
): Promise<Paginated<OperationalCashEntry>> {
  const { data } = await api.get<Paginated<OperationalCashEntry>>(
    `/api/expenses/entries/${buildEntryQuery(params)}`
  )
  return data
}

export async function fetchOperationalCashEntry(id: number): Promise<OperationalCashEntry> {
  const { data } = await api.get<OperationalCashEntry>(`/api/expenses/entries/${id}/`)
  return data
}

export async function createOperationalCashEntry(
  body: OperationalCashEntryCreateInput
): Promise<OperationalCashEntry> {
  const { data } = await api.post<OperationalCashEntry>('/api/expenses/entries/', body)
  return data
}

export async function updateOperationalCashEntry(
  id: number,
  body: OperationalCashEntryUpdateInput
): Promise<OperationalCashEntry> {
  const { data } = await api.patch<OperationalCashEntry>(`/api/expenses/entries/${id}/`, body)
  return data
}

export async function deleteOperationalCashEntry(id: number): Promise<void> {
  await api.delete(`/api/expenses/entries/${id}/`)
}

export async function uploadOperationalCashEntryAttachment(
  id: number,
  file: File
): Promise<OperationalCashEntry> {
  const form = new FormData()
  form.append('attachment', file)
  const { data } = await api.post<OperationalCashEntry>(
    `/api/expenses/entries/${id}/upload-attachment/`,
    form
  )
  return data
}
