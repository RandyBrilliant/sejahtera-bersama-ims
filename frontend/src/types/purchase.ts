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
  phone: string
  address: string
  notes: string
  wilayah: number | null
  wilayah_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type Wilayah = {
  id: number
  name: string
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
  status: OrderStatus
  invoice_number: string
  invoice_date: string | null
  subtotal_idr: number
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
  /** Berat bersih per kemasan (kg), untuk menghitung total kg order. */
  net_mass_kg?: string
  /** Harga tetap per kg (IDR) dari produk induk. */
  price_per_kg_idr?: number
  quantity: string
  /** Harga per kemasan hasil resolusi (per kg × berat). */
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
  customer_wilayah_name: string | null
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
  start_date?: string
  end_date?: string
}

export type SalesOrdersListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  status?: OrderStatus
  customer?: number
  start_date?: string
  end_date?: string
}

export type CustomersListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  is_active?: boolean
  wilayah?: number
}

export type CustomerCreateInput = {
  name: string
  phone?: string
  address: string
  notes?: string
  wilayah?: number | null
  is_active?: boolean
}

export type CustomerUpdateInput = Partial<CustomerCreateInput>

export type PurchaseInLineInput = {
  ingredient_inventory: number
  quantity: string | number
  unit_cost_idr: number
}

export type PurchaseInOrderCreateInput = {
  status?: OrderStatus
  invoice_number?: string
  invoice_date?: string | null
  notes?: string
  lines: PurchaseInLineInput[]
}

export type PurchaseInOrderUpdateInput = Partial<
  Omit<PurchaseInOrderCreateInput, 'lines'> & { lines?: PurchaseInLineInput[] }
>

export type SalesOrderLineInput = {
  product_packaging: number
  quantity: string | number
  /** Harga custom per kg (IDR) untuk order ini; kosong = pakai harga produk. */
  unit_price_per_kg_idr?: number | null
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

/** Harga khusus pelanggan per kemasan (`/api/purchase/customer-product-prices/`). */
export type CustomerProductPrice = {
  id: number
  customer: number
  customer_name: string
  product_packaging: number
  packaging_label: string
  variant_name: string
  /** Harga jual per kemasan (bukan per kg). */
  selling_price_idr: number
  note: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type CustomerProductPricesListParams = {
  page?: number
  page_size?: number
  ordering?: string
  customer?: number
  product_packaging?: number
  is_active?: boolean
}

export type CustomerProductPriceCreateInput = {
  customer: number
  product_packaging: number
  selling_price_idr: number
  note?: string
  is_active?: boolean
}

export type CustomerProductPriceUpdateInput = Partial<
  Omit<CustomerProductPriceCreateInput, 'customer'>
> & {
  customer?: number
}
