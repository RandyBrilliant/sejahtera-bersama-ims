import type { AuditUserMini } from '@/types/inventory'

export type EntryKind = 'INCOME' | 'EXPENSE'

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type OperationalCategory = {
  id: number
  name: string
  slug: string
  entry_kind: EntryKind
  description: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type OperationalCashEntry = {
  id: number
  direction: EntryKind
  category: number
  category_name: string
  amount_idr: number
  occurred_on: string
  description: string
  reference: string
  sales_order: number | null
  sales_order_code: string | null
  purchase_in_order: number | null
  purchase_in_order_code: string | null
  attachment: string | null
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type OperationalCategoryListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  entry_kind?: EntryKind
  is_active?: boolean
}

export type OperationalCashEntryListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  direction?: EntryKind
  category?: number
  occurred_on_from?: string
  occurred_on_to?: string
  sales_order?: number
  purchase_in_order?: number
}

export type OperationalCategoryCreateInput = {
  name: string
  entry_kind: EntryKind
  description?: string
  sort_order?: number
  is_active?: boolean
}

export type OperationalCategoryUpdateInput = Partial<OperationalCategoryCreateInput>

export type OperationalCashEntryCreateInput = {
  direction: EntryKind
  category: number
  amount_idr: number
  occurred_on: string
  description: string
  reference?: string
  sales_order?: number | null
  purchase_in_order?: number | null
}

export type OperationalCashEntryUpdateInput = Partial<OperationalCashEntryCreateInput>
