import { api } from '@/lib/api'
import type {
  HppProfitEnvelope,
  HppProfitReportPayload,
  SalesRevenueReportPayload,
  SalesRevenueEnvelope,
} from '@/types/reports'
import type {
  Customer,
  CustomerCreateInput,
  CustomerUpdateInput,
  CustomersListParams,
  Wilayah,
  Paginated,
  PurchaseInOrder,
  PurchaseInOrderCreateInput,
  PurchaseInOrderUpdateInput,
  PurchaseInOrdersListParams,
  SalesOrder,
  SalesOrderCreateInput,
  SalesOrdersListParams,
  SalesOrderUpdateInput,
  CustomerProductPrice,
  CustomerProductPriceCreateInput,
  CustomerProductPricesListParams,
  CustomerProductPriceUpdateInput,
} from '@/types/purchase'

function buildPurchaseInQuery(params: PurchaseInOrdersListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.status) search.set('status', params.status)
  if (params.start_date) search.set('start_date', params.start_date)
  if (params.end_date) search.set('end_date', params.end_date)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function buildSalesOrderQuery(params: SalesOrdersListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.status) search.set('status', params.status)
  if (params.customer != null) search.set('customer', String(params.customer))
  if (params.start_date) search.set('start_date', params.start_date)
  if (params.end_date) search.set('end_date', params.end_date)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function buildCustomersQuery(params: CustomersListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.is_active !== undefined) search.set('is_active', String(params.is_active))
  if (params.wilayah != null) search.set('wilayah', String(params.wilayah))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchWilayah(
  params: { page?: number; page_size?: number; search?: string; ordering?: string } = {}
): Promise<Paginated<Wilayah>> {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  const qs = search.toString()
  const { data } = await api.get<Paginated<Wilayah>>(`/api/purchase/wilayah/${qs ? `?${qs}` : ''}`)
  return data
}

export async function createWilayah(body: { name: string; is_active?: boolean }): Promise<Wilayah> {
  const { data } = await api.post<Wilayah>('/api/purchase/wilayah/', body)
  return data
}

export async function updateWilayah(
  id: number,
  body: Partial<{ name: string; is_active: boolean }>
): Promise<Wilayah> {
  const { data } = await api.patch<Wilayah>(`/api/purchase/wilayah/${id}/`, body)
  return data
}

export async function fetchCustomers(
  params: CustomersListParams
): Promise<Paginated<Customer>> {
  const { data } = await api.get<Paginated<Customer>>(
    `/api/purchase/customers/${buildCustomersQuery(params)}`
  )
  return data
}

export async function fetchCustomer(id: number): Promise<Customer> {
  const { data } = await api.get<Customer>(`/api/purchase/customers/${id}/`)
  return data
}

export async function createCustomer(body: CustomerCreateInput): Promise<Customer> {
  const { data } = await api.post<Customer>('/api/purchase/customers/', body)
  return data
}

export async function updateCustomer(
  id: number,
  body: CustomerUpdateInput
): Promise<Customer> {
  const { data } = await api.patch<Customer>(`/api/purchase/customers/${id}/`, body)
  return data
}

export async function deleteCustomer(id: number): Promise<void> {
  await api.delete(`/api/purchase/customers/${id}/`)
}

export async function deleteWilayah(id: number): Promise<void> {
  await api.delete(`/api/purchase/wilayah/${id}/`)
}

export async function fetchPurchaseInOrders(
  params: PurchaseInOrdersListParams
): Promise<Paginated<PurchaseInOrder>> {
  const { data } = await api.get<Paginated<PurchaseInOrder>>(
    `/api/purchase/purchase-in-orders/${buildPurchaseInQuery(params)}`
  )
  return data
}

export async function fetchPurchaseInOrder(id: number): Promise<PurchaseInOrder> {
  const { data } = await api.get<PurchaseInOrder>(
    `/api/purchase/purchase-in-orders/${id}/`
  )
  return data
}

export async function createPurchaseInOrder(
  body: PurchaseInOrderCreateInput
): Promise<PurchaseInOrder> {
  const { data } = await api.post<PurchaseInOrder>(
    '/api/purchase/purchase-in-orders/',
    body
  )
  return data
}

export async function updatePurchaseInOrder(
  id: number,
  body: PurchaseInOrderUpdateInput
): Promise<PurchaseInOrder> {
  const { data } = await api.patch<PurchaseInOrder>(
    `/api/purchase/purchase-in-orders/${id}/`,
    body
  )
  return data
}

export async function deletePurchaseInOrder(id: number): Promise<void> {
  await api.delete(`/api/purchase/purchase-in-orders/${id}/`)
}

export async function uploadPurchaseInPaymentProof(
  id: number,
  file: File
): Promise<PurchaseInOrder> {
  const form = new FormData()
  form.append('payment_proof', file)
  const { data } = await api.post<PurchaseInOrder>(
    `/api/purchase/purchase-in-orders/${id}/upload-payment-proof/`,
    form
  )
  return data
}

export async function verifyPurchaseInOrder(id: number): Promise<PurchaseInOrder> {
  const { data } = await api.post<PurchaseInOrder>(
    `/api/purchase/purchase-in-orders/${id}/verify/`
  )
  return data
}

export async function cancelPurchaseInOrder(id: number): Promise<PurchaseInOrder> {
  const { data } = await api.post<PurchaseInOrder>(
    `/api/purchase/purchase-in-orders/${id}/cancel/`
  )
  return data
}

export async function fetchSalesOrders(
  params: SalesOrdersListParams
): Promise<Paginated<SalesOrder>> {
  const { data } = await api.get<Paginated<SalesOrder>>(
    `/api/purchase/sales-orders/${buildSalesOrderQuery(params)}`
  )
  return data
}

export async function fetchSalesOrder(id: number): Promise<SalesOrder> {
  const { data } = await api.get<SalesOrder>(`/api/purchase/sales-orders/${id}/`)
  return data
}

export async function createSalesOrder(body: SalesOrderCreateInput): Promise<SalesOrder> {
  const { data } = await api.post<SalesOrder>('/api/purchase/sales-orders/', body)
  return data
}

export async function updateSalesOrder(
  id: number,
  body: SalesOrderUpdateInput
): Promise<SalesOrder> {
  const { data } = await api.patch<SalesOrder>(
    `/api/purchase/sales-orders/${id}/`,
    body
  )
  return data
}

export async function deleteSalesOrder(id: number): Promise<void> {
  await api.delete(`/api/purchase/sales-orders/${id}/`)
}

export async function uploadSalesPaymentProof(
  id: number,
  file: File
): Promise<SalesOrder> {
  const form = new FormData()
  form.append('payment_proof', file)
  const { data } = await api.post<SalesOrder>(
    `/api/purchase/sales-orders/${id}/upload-payment-proof/`,
    form
  )
  return data
}

export async function downloadSalesInvoicePdf(id: number): Promise<Blob> {
  const { data } = await api.get<Blob>(
    `/api/purchase/sales-orders/${id}/invoice-pdf/`,
    { responseType: 'blob' }
  )
  return data
}

export type SalesReceiptMode = 'preprinted' | 'full'

export async function downloadSalesReceiptPdf(
  id: number,
  mode: SalesReceiptMode
): Promise<Blob> {
  const { data } = await api.get<Blob>(
    `/api/purchase/sales-orders/${id}/receipt-pdf/`,
    { params: { mode }, responseType: 'blob' }
  )
  return data
}

export async function verifySalesOrder(id: number): Promise<SalesOrder> {
  const { data } = await api.post<SalesOrder>(
    `/api/purchase/sales-orders/${id}/verify/`
  )
  return data
}

export async function cancelSalesOrder(id: number): Promise<SalesOrder> {
  const { data } = await api.post<SalesOrder>(
    `/api/purchase/sales-orders/${id}/cancel/`
  )
  return data
}

export async function fetchSalesRevenueReport(
  startDate: string,
  endDate: string
): Promise<SalesRevenueReportPayload> {
  const { data } = await api.get<SalesRevenueEnvelope>(
    '/api/purchase/reports/sales-revenue/',
    { params: { start_date: startDate, end_date: endDate } }
  )
  return data.data
}

export async function fetchHppProfitReport(
  startDate: string,
  endDate: string
): Promise<HppProfitReportPayload> {
  const { data } = await api.get<HppProfitEnvelope>('/api/purchase/reports/hpp/', {
    params: { start_date: startDate, end_date: endDate },
  })
  return data.data
}

function buildCustomerProductPricesQuery(params: CustomerProductPricesListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.customer != null) search.set('customer', String(params.customer))
  if (params.product_packaging != null) {
    search.set('product_packaging', String(params.product_packaging))
  }
  if (params.is_active !== undefined) search.set('is_active', String(params.is_active))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchCustomerProductPrices(
  params: CustomerProductPricesListParams
): Promise<Paginated<CustomerProductPrice>> {
  const { data } = await api.get<Paginated<CustomerProductPrice>>(
    `/api/purchase/customer-product-prices/${buildCustomerProductPricesQuery(params)}`
  )
  return data
}

export async function createCustomerProductPrice(
  body: CustomerProductPriceCreateInput
): Promise<CustomerProductPrice> {
  const { data } = await api.post<CustomerProductPrice>(
    '/api/purchase/customer-product-prices/',
    body
  )
  return data
}

export async function updateCustomerProductPrice(
  id: number,
  body: CustomerProductPriceUpdateInput
): Promise<CustomerProductPrice> {
  const { data } = await api.patch<CustomerProductPrice>(
    `/api/purchase/customer-product-prices/${id}/`,
    body
  )
  return data
}

export async function deleteCustomerProductPrice(id: number): Promise<void> {
  await api.delete(`/api/purchase/customer-product-prices/${id}/`)
}
