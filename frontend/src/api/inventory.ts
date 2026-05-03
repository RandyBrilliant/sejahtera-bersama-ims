import { api } from '@/lib/api'
import type {
  Ingredient,
  IngredientCreateInput,
  IngredientInventory,
  IngredientInventoryListParams,
  IngredientInventoryUpdateInput,
  IngredientStockMovement,
  IngredientStockMovementCreateInput,
  IngredientStockMovementListParams,
  IngredientsListParams,
  IngredientUpdateInput,
  InventoryRangeRecapPayload,
  InventorySummaryPayload,
  Paginated,
  Product,
  ProductCreateInput,
  ProductPackaging,
  ProductPackagingCreateInput,
  ProductPackagingListParams,
  ProductPackagingUpdateInput,
  ProductStockMovement,
  ProductStockMovementCreateInput,
  ProductStockMovementListParams,
  ProductsListParams,
  ProductUpdateInput,
} from '@/types/inventory'

type SummaryEnvelope = { code?: string; data: InventorySummaryPayload }
type RangeRecapEnvelope = { code?: string; data: InventoryRangeRecapPayload }

function buildProductsQuery(params: ProductsListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.is_active !== undefined) search.set('is_active', String(params.is_active))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function buildPackagingQuery(params: ProductPackagingListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.product != null) search.set('product', String(params.product))
  if (params.is_active !== undefined) search.set('is_active', String(params.is_active))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchInventorySummary(): Promise<InventorySummaryPayload> {
  const { data } = await api.get<SummaryEnvelope>('/api/inventory/summary/')
  return data.data
}

export async function fetchInventoryRangeRecap(
  startDate: string,
  endDate: string
): Promise<InventoryRangeRecapPayload> {
  const { data } = await api.get<RangeRecapEnvelope>('/api/inventory/summary/range/', {
    params: { start_date: startDate, end_date: endDate },
  })
  return data.data
}

export async function fetchProducts(
  params: ProductsListParams
): Promise<Paginated<Product>> {
  const { data } = await api.get<Paginated<Product>>(
    `/api/inventory/products/${buildProductsQuery(params)}`
  )
  return data
}

export async function fetchProduct(id: number): Promise<Product> {
  const { data } = await api.get<Product>(`/api/inventory/products/${id}/`)
  return data
}

export async function createProduct(body: ProductCreateInput): Promise<Product> {
  const { data } = await api.post<Product>('/api/inventory/products/', body)
  return data
}

export async function updateProduct(id: number, body: ProductUpdateInput): Promise<Product> {
  const { data } = await api.patch<Product>(`/api/inventory/products/${id}/`, body)
  return data
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/api/inventory/products/${id}/`)
}

export async function fetchProductPackagingList(
  params: ProductPackagingListParams
): Promise<Paginated<ProductPackaging>> {
  const { data } = await api.get<Paginated<ProductPackaging>>(
    `/api/inventory/product-packaging/${buildPackagingQuery(params)}`
  )
  return data
}

export async function fetchProductPackaging(id: number): Promise<ProductPackaging> {
  const { data } = await api.get<ProductPackaging>(
    `/api/inventory/product-packaging/${id}/`
  )
  return data
}

export async function createProductPackaging(
  body: ProductPackagingCreateInput
): Promise<ProductPackaging> {
  const { data } = await api.post<ProductPackaging>(
    '/api/inventory/product-packaging/',
    body
  )
  return data
}

export async function updateProductPackaging(
  id: number,
  body: ProductPackagingUpdateInput
): Promise<ProductPackaging> {
  const { data } = await api.patch<ProductPackaging>(
    `/api/inventory/product-packaging/${id}/`,
    body
  )
  return data
}

export async function deleteProductPackaging(id: number): Promise<void> {
  await api.delete(`/api/inventory/product-packaging/${id}/`)
}

/* ——— Ingredients ——— */

function buildIngredientsQuery(params: IngredientsListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.is_active !== undefined) search.set('is_active', String(params.is_active))
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function buildIngredientInventoryQuery(params: IngredientInventoryListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.ingredient != null) search.set('ingredient', String(params.ingredient))
  if (params.is_below_minimum !== undefined) {
    search.set('is_below_minimum', String(params.is_below_minimum))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function buildIngredientMovementQuery(params: IngredientStockMovementListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.ingredient_inventory != null) {
    search.set('ingredient_inventory', String(params.ingredient_inventory))
  }
  if (params.movement_type) search.set('movement_type', params.movement_type)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function buildProductMovementQuery(params: ProductStockMovementListParams): string {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.page_size != null) search.set('page_size', String(params.page_size))
  if (params.search) search.set('search', params.search)
  if (params.ordering) search.set('ordering', params.ordering)
  if (params.product_packaging != null) {
    search.set('product_packaging', String(params.product_packaging))
  }
  if (params.movement_type) search.set('movement_type', params.movement_type)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export async function fetchIngredients(
  params: IngredientsListParams
): Promise<Paginated<Ingredient>> {
  const { data } = await api.get<Paginated<Ingredient>>(
    `/api/inventory/ingredients/${buildIngredientsQuery(params)}`
  )
  return data
}

export async function fetchIngredient(id: number): Promise<Ingredient> {
  const { data } = await api.get<Ingredient>(`/api/inventory/ingredients/${id}/`)
  return data
}

export async function createIngredient(body: IngredientCreateInput): Promise<Ingredient> {
  const { data } = await api.post<Ingredient>('/api/inventory/ingredients/', body)
  return data
}

export async function updateIngredient(
  id: number,
  body: IngredientUpdateInput
): Promise<Ingredient> {
  const { data } = await api.patch<Ingredient>(`/api/inventory/ingredients/${id}/`, body)
  return data
}

export async function deleteIngredient(id: number): Promise<void> {
  await api.delete(`/api/inventory/ingredients/${id}/`)
}

export async function fetchIngredientInventories(
  params: IngredientInventoryListParams
): Promise<Paginated<IngredientInventory>> {
  const { data } = await api.get<Paginated<IngredientInventory>>(
    `/api/inventory/ingredient-inventory/${buildIngredientInventoryQuery(params)}`
  )
  return data
}

export async function fetchIngredientInventory(id: number): Promise<IngredientInventory> {
  const { data } = await api.get<IngredientInventory>(
    `/api/inventory/ingredient-inventory/${id}/`
  )
  return data
}

export async function updateIngredientInventory(
  id: number,
  body: IngredientInventoryUpdateInput
): Promise<IngredientInventory> {
  const { data } = await api.patch<IngredientInventory>(
    `/api/inventory/ingredient-inventory/${id}/`,
    body
  )
  return data
}

export async function fetchIngredientStockMovements(
  params: IngredientStockMovementListParams
): Promise<Paginated<IngredientStockMovement>> {
  const { data } = await api.get<Paginated<IngredientStockMovement>>(
    `/api/inventory/ingredient-stock-movements/${buildIngredientMovementQuery(params)}`
  )
  return data
}

export async function createIngredientStockMovement(
  body: IngredientStockMovementCreateInput
): Promise<IngredientStockMovement> {
  const { data } = await api.post<IngredientStockMovement>(
    '/api/inventory/ingredient-stock-movements/',
    body
  )
  return data
}

export async function fetchProductStockMovements(
  params: ProductStockMovementListParams
): Promise<Paginated<ProductStockMovement>> {
  const { data } = await api.get<Paginated<ProductStockMovement>>(
    `/api/inventory/product-stock-movements/${buildProductMovementQuery(params)}`
  )
  return data
}

export async function createProductStockMovement(
  body: ProductStockMovementCreateInput
): Promise<ProductStockMovement> {
  const { data } = await api.post<ProductStockMovement>(
    '/api/inventory/product-stock-movements/',
    body
  )
  return data
}
