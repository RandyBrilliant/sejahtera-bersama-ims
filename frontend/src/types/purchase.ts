import type { AuditUserMini } from '@/types/inventory'

export type OrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_PROOF_UPLOADED'
  | 'VERIFIED'
  | 'CANCELLED'

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Customer = {
  id: number
  name: string
  company_name: string
  phone: string
  email: string
  address: string
  tax_id: string
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type PurchaseInLine = {
  id: number
  ingredient_inventory: number
  ingredient_name: string
  quantity: string
  unit_cost_idr: number
  line_total_idr: number
  created_at: string
  updated_at: string
}

export type PurchaseInOrder = {
  id: number
  order_code: string
  supplier_name: string
  supplier_phone: string
  status: OrderStatus
  invoice_number: string
  invoice_date: string | null
  due_date: string | null
  subtotal_idr: number
  tax_amount_idr: number
  total_idr: number
  payment_proof: string | null
  payment_proof_uploaded_at: string | null
  verified_at: string | null
  verified_by: AuditUserMini | null
  notes: string
  lines: PurchaseInLine[]
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type SalesOrderLine = {
  id: number
  product_packaging: number
  product_variant_name: string
  packaging_label: string
  quantity: string
  unit_price_idr: number
  line_total_idr: number
  created_at: string
  updated_at: string
}

export type SalesOrder = {
  id: number
  order_code: string
  customer: number
  customer_name: string
  status: OrderStatus
  invoice_number: string
  invoice_date: string | null
  due_date: string | null
  subtotal_idr: number
  tax_amount_idr: number
  total_idr: number
  payment_proof: string | null
  payment_proof_uploaded_at: string | null
  verified_at: string | null
  verified_by: AuditUserMini | null
  notes: string
  lines: SalesOrderLine[]
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type PurchaseInOrdersListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  status?: OrderStatus
}

export type SalesOrdersListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  status?: OrderStatus
  customer?: number
}

export type CustomersListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  is_active?: boolean
}

export type CustomerCreateInput = {
  name: string
  phone: string
  company_name?: string
  email?: string
  address?: string
  tax_id?: string
  notes?: string
  is_active?: boolean
}

export type CustomerUpdateInput = Partial<CustomerCreateInput>

export type PurchaseInLineInput = {
  ingredient_inventory: number
  quantity: string | number
  unit_cost_idr: number
}

export type PurchaseInOrderCreateInput = {
  supplier_name: string
  supplier_phone?: string
  status?: OrderStatus
  invoice_number?: string
  invoice_date?: string | null
  due_date?: string | null
  tax_amount_idr?: number
  notes?: string
  lines: PurchaseInLineInput[]
}

export type PurchaseInOrderUpdateInput = Partial<
  Omit<PurchaseInOrderCreateInput, 'lines'> & { lines?: PurchaseInLineInput[] }
>

export type SalesOrderLineInput = {
  product_packaging: number
  quantity: string | number
  unit_price_idr?: number | null
}

export type SalesOrderCreateInput = {
  customer: number
  status?: OrderStatus
  invoice_number?: string
  invoice_date?: string | null
  due_date?: string | null
  tax_amount_idr?: number
  notes?: string
  lines: SalesOrderLineInput[]
}

export type SalesOrderUpdateInput = Partial<
  Omit<SalesOrderCreateInput, 'lines'> & { lines?: SalesOrderLineInput[] }
>
