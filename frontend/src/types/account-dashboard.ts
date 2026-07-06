import type { IngredientInventory, ProductPackaging } from '@/types/inventory'
import type { OrderStatus } from '@/types/purchase'

export type DashboardDateRange = {
  start_date: string
  end_date: string
}

export type DashboardRevenueBlock = {
  start_date: string
  end_date: string
  summary: {
    verified_order_count: number
    total_revenue_idr: number | string
    total_subtotal_idr: number | string
    total_tax_idr: number | string
  }
}

export type DashboardCashBlock = {
  start_date: string
  end_date: string
  income: { total_idr: number | string; line_count: number }
  expense: { total_idr: number | string; line_count: number }
  net_cash_idr: number
}

export type DashboardActivityRow = {
  id: number
  order_code: string
  status: OrderStatus
  created_at: string
  kind: 'sales' | 'purchase'
}

export type InventorySummaryPayload = {
  products: {
    total_packaging: number
    active_packaging: number
    total_product_mass_grams: string
    total_product_stock_value_idr: string
  }
  ingredients: {
    total_ingredient_items: number
    low_stock_items: number
    total_ingredient_stock: string
  }
}

export type AdminDashboardPayload = {
  range_current: DashboardDateRange
  range_previous: DashboardDateRange
  orders: {
    active_sales: number
    active_purchase: number
    active_total: number
  }
  revenue: {
    current: DashboardRevenueBlock
    previous: DashboardRevenueBlock
  }
  operational_cash: {
    current: DashboardCashBlock
    previous: DashboardCashBlock
  }
  inventory_summary: InventorySummaryPayload
  top_packaging: { results: ProductPackaging[] }
  low_ingredient_stock: { results: IngredientInventory[] }
  recent_activity: { results: DashboardActivityRow[] }
  users: {
    total: number
    active: number
  }
}
