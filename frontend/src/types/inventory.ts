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
  /** Harga tetap per kg (IDR) yang diatur admin. */
  price_per_kg_idr: number
  /** Bulk stock for this variant (API: grams; tampilan UI: kg). */
  remaining_mass_grams: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

/** `PackagingType` di backend (inventory.models) — jenis kemasan luar. */
export type PackagingType = 'BAL' | 'KTK'

export type ProductPackaging = {
  id: number
  product: number
  product_name: string
  product_variant_name: string
  /** Harga tetap per kg (IDR) dari produk induk. */
  price_per_kg_idr: number
  label: string
  /** Jenis kemasan luar: BAL (bal) atau KTK (kotak). Default BAL. */
  packaging_type: PackagingType
  /** Berat bersih per kemasan (kg). */
  net_mass_kg: string
  remaining_stock: string
  /** Harga total per kemasan = price_per_kg_idr × net_mass_kg. */
  total_price_idr: number
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
  packaging_type?: PackagingType
}

export type ProductCreateInput = {
  name: string
  variant_name: string
  price_per_kg_idr: number
  is_active?: boolean
}

export type ProductUpdateInput = Partial<ProductCreateInput>

export type ProductPackagingCreateInput = {
  product: number
  label: string
  packaging_type?: PackagingType
  net_mass_kg: string | number
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
    total_product_mass_grams: string
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
  ingredient_unit: StockUnit
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
  product: number
  product_packaging: number | null
  product_packaging_label: string
  product_variant_name: string
  movement_type: StockMovementType
  mass_grams: string
  bonus_mass_grams: string
  total_mass_grams: string
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
  product?: number
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
  product: number
  movement_type: StockMovementType
  mass_grams: string | number
  bonus_mass_grams?: string | number
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
  total_price_idr: number
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

/** Batch produksi harian (`/api/inventory/production-batches/`). */
export type ProductionIngredientUsage = {
  id: number
  ingredient_inventory: number
  ingredient_name: string
  unit: StockUnit | string
  quantity_used: string
}

export type ProductionPackagingOutput = {
  id: number
  product_packaging: number
  product_variant_name: string
  packaging_label: string
  quantity_produced: string
  bonus_quantity: string
  total_quantity_in: string
}

export type ProductionBatch = {
  id: number
  production_date: string
  shift_label: string
  note: string
  ingredient_usages: ProductionIngredientUsage[]
  packaging_outputs: ProductionPackagingOutput[]
  total_ingredient_used: string
  total_product_packages: string
  total_bonus_packages: string
  created_at: string
  updated_at: string
  created_by: AuditUserMini | null
  updated_by: AuditUserMini | null
}

export type ProductionBatchesListParams = {
  page?: number
  page_size?: number
  search?: string
  ordering?: string
  production_date?: string
  production_date_from?: string
  production_date_to?: string
  shift_label?: string
}

export type ProductionIngredientUsageInput = {
  ingredient_inventory: number
  quantity_used: string | number
}

export type ProductionPackagingOutputInput = {
  product_packaging: number
  quantity_produced: string | number
  bonus_quantity?: string | number
}

export type ProductionBatchCreateInput = {
  production_date: string
  shift_label?: string
  note?: string
  ingredient_usages_input: ProductionIngredientUsageInput[]
  packaging_outputs_input: ProductionPackagingOutputInput[]
}
