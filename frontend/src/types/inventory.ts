/** Audit user snippet from inventory serializers. */
export type AuditUserMini = {
  id: number
  username: string
  full_name: string
}

export type Product = {
  id: number
  name: string
  variant_name: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type ProductPackaging = {
  id: number
  product: number
  product_name: string
  product_variant_name: string
  label: string
  net_mass_grams: number
  remaining_stock: string
  base_price_idr: number
  list_price_idr: number | null
  stock_value_idr: number
  sku: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type ProductsListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  is_active?: boolean
}

export type ProductPackagingListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  product?: number
  is_active?: boolean
}

export type ProductCreateInput = {
  name: string
  variant_name: string
  is_active?: boolean
}

export type ProductUpdateInput = Partial<ProductCreateInput>

export type ProductPackagingCreateInput = {
  product: number
  label: string
  net_mass_grams: number
  remaining_stock?: string | number
  base_price_idr: number
  list_price_idr?: number | null
  sku?: string
  is_active?: boolean
}

export type ProductPackagingUpdateInput = Partial<
  Omit<ProductPackagingCreateInput, 'product'>
> & {
  product?: number
}

export type InventorySummaryPayload = {
  products: {
    total_packaging: number
    active_packaging: number
    total_product_stock: string
    total_product_stock_value_idr: string
  }
  ingredients: {
    total_ingredient_items: number
    low_stock_items: number
    total_ingredient_stock: string
  }
}

/** `StockUnit` di backend (inventory.models). */
export type StockUnit = 'KG' | 'L' | 'PCS'

export type Ingredient = {
  id: number
  name: string
  default_unit: StockUnit
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type IngredientInventory = {
  id: number
  ingredient: number
  ingredient_name: string
  ingredient_unit: StockUnit
  remaining_stock: string
  minimum_stock: string
  is_below_minimum: boolean
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type StockMovementType = 'IN' | 'OUT'

export type IngredientStockMovement = {
  id: number
  ingredient_inventory: number
  ingredient_name: string
  movement_type: StockMovementType
  quantity: string
  note: string
  movement_at: string
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type ProductStockMovement = {
  id: number
  product_packaging: number
  product_packaging_label: string
  product_variant_name: string
  movement_type: StockMovementType
  quantity: string
  bonus_quantity: string
  total_increase_quantity: string
  note: string
  movement_at: string
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type IngredientsListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  is_active?: boolean
}

export type IngredientInventoryListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  ingredient?: number
  is_below_minimum?: boolean
}

export type IngredientStockMovementListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  ingredient_inventory?: number
  movement_type?: StockMovementType | ''
}

export type ProductStockMovementListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  product_packaging?: number
  movement_type?: StockMovementType | ''
}

export type IngredientCreateInput = {
  name: string
  default_unit: StockUnit
  is_active?: boolean
}

export type IngredientUpdateInput = Partial<IngredientCreateInput>

export type IngredientInventoryUpdateInput = {
  remaining_stock?: string | number
  minimum_stock?: string | number
}

export type IngredientStockMovementCreateInput = {
  ingredient_inventory: number
  movement_type: StockMovementType
  quantity: string | number
  note?: string
  movement_at: string
}

export type ProductStockMovementCreateInput = {
  product_packaging: number
  movement_type: StockMovementType
  quantity: string | number
  bonus_quantity?: string | number
  note?: string
  movement_at: string
}

/** Rekap produksi & pemakaian bahan untuk rentang tanggal (`/api/inventory/summary/range/`). */
export type InventoryRangeRecapSummary = {
  total_batches: number
  total_ingredients_used: string | number
  total_packages_produced: string | number
  total_bonus_packages: string | number
  total_packages_output: string | number
  estimated_production_value_idr: string | number
}

export type InventoryRangeIngredientUsageRow = {
  ingredient_inventory: number
  ingredient_name: string
  unit: string
  total_used: string | number
}

export type InventoryRangePackagingOutputRow = {
  product_packaging: number
  variant_name: string
  packaging_label: string
  base_price_idr: number
  total_produced: string | number
  total_bonus: string | number
  total_output: string | number
  estimated_value_idr: string | number
}

export type InventoryRangeRecapPayload = {
  start_date: string
  end_date: string
  summary: InventoryRangeRecapSummary
  ingredient_usage: InventoryRangeIngredientUsageRow[]
  packaging_output: InventoryRangePackagingOutputRow[]
}
