/** Ringkasan laporan pendapatan (order terverifikasi, `verified_at` dalam rentang). */
export type SalesRevenueSummary = {
  verified_order_count: number
  total_revenue_idr: string | number
  total_subtotal_idr?: string | number
  total_tax_idr?: string | number
}

export type SalesRevenueByCustomerRow = {
  customer_id: number
  customer__name: string
  orders: number
  revenue_idr: string | number
}

export type SalesRevenueByPackagingRow = {
  product_packaging_id: number
  product_packaging__label: string
  product_packaging__product__variant_name: string
  total_quantity: string | number
  revenue_idr: string | number
}

export type SalesRevenueReportPayload = {
  start_date: string
  end_date: string
  summary: SalesRevenueSummary
  by_customer: SalesRevenueByCustomerRow[]
  by_packaging: SalesRevenueByPackagingRow[]
}

/** Baris agregat kas per kategori (nama field mengikuti serializer Django `values()`). */
export type OperationalCashByCategoryRow = {
  category_id: number
  category__name: string
  direction: string
  total_idr: string | number
  lines: number
}

export type OperationalCashByDayRow = {
  occurred_on: string
  income_idr: number
  expense_idr: number
  net_idr: number
}

export type OperationalCashEntryReportRow = {
  id: number
  occurred_on: string
  direction: string
  payment_method: string
  category_id: number
  category_name: string
  amount_idr: number
  description: string
  reference: string
  sales_order_id: number | null
  sales_order_code: string | null
}

export type OperationalCashEntriesReportEnvelope = {
  total_count: number
  returned_count: number
  truncated: boolean
  rows: OperationalCashEntryReportRow[]
}

export type OperationalCashLinkedBreakdown = {
  linked_to_sales_order: { total_idr: string | number; line_count: number }
  unlinked: { income_idr: number; expense_idr: number; line_count: number }
}

/** Payload lengkap `/api/expenses/report/?export=json`. */
export type OperationalCashFullReportPayload = {
  start_date: string
  end_date: string
  income: { total_idr: string | number; line_count: number }
  expense: { total_idr: string | number; line_count: number }
  net_cash_idr: number
  by_category: OperationalCashByCategoryRow[]
  by_day: OperationalCashByDayRow[]
  linked_breakdown: OperationalCashLinkedBreakdown
  entries: OperationalCashEntriesReportEnvelope
}

/** Agregat kas operasional untuk rentang tanggal. */
export type OperationalCashSummaryPayload = {
  start_date: string
  end_date: string
  income: { total_idr: string | number; line_count: number }
  expense: { total_idr: string | number; line_count: number }
  net_cash_idr: number
  by_category: unknown[]
}

/** Baris HPP & margin per varian produk (COGS bahan eksak; tenaga kerja dialokasikan per kg). */
export type HppProfitByVariantRow = {
  product_id: number
  variant_name: string
  kg: string
  revenue_idr: number
  cogs_material_idr: number
  allocated_labor_idr: number
  hpp_idr: number
  gross_profit_idr: number
}

/** Laba rugi pemilik: pendapatan - HPP = laba kotor; - OPEX = laba bersih. */
export type HppProfitReportPayload = {
  start_date: string
  end_date: string
  verified_order_count: number
  kg_sold: string
  revenue_idr: number
  cogs: {
    material_idr: number
    labor_kupas_idr: number
    labor_daily_production_idr: number
    total_idr: number
  }
  gross_profit_idr: number
  opex: {
    expenses_idr: number
    labor_nonproduction_idr: number
    total_idr: number
  }
  net_profit_idr: number
  hpp_per_kg_idr: number
  by_variant: HppProfitByVariantRow[]
}

type Envelope<T> = { code?: string; data: T }

export type SalesRevenueEnvelope = Envelope<SalesRevenueReportPayload>
export type HppProfitEnvelope = Envelope<HppProfitReportPayload>
export type OperationalCashEnvelope = Envelope<OperationalCashSummaryPayload>
export type OperationalCashFullEnvelope = Envelope<OperationalCashFullReportPayload>
