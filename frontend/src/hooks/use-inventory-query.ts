import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  createIngredient,
  createIngredientStockMovement,
  createProduct,
  createProductPackaging,
  createProductStockMovement,
  deleteIngredient,
  deleteProduct,
  deleteProductPackaging,
  fetchIngredient,
  fetchIngredientInventories,
  fetchIngredientInventory,
  fetchIngredients,
  fetchIngredientStockMovements,
  fetchInventorySummary,
  fetchProduct,
  fetchProductPackaging,
  fetchProductPackagingList,
  fetchProducts,
  fetchProductStockMovements,
  updateIngredient,
  updateIngredientInventory,
  updateProduct,
  updateProductPackaging,
} from '@/api/inventory'
import type {
  IngredientCreateInput,
  IngredientInventoryListParams,
  IngredientInventoryUpdateInput,
  IngredientStockMovementCreateInput,
  IngredientStockMovementListParams,
  IngredientsListParams,
  IngredientUpdateInput,
  ProductCreateInput,
  ProductPackagingCreateInput,
  ProductPackagingListParams,
  ProductPackagingUpdateInput,
  ProductStockMovementCreateInput,
  ProductStockMovementListParams,
  ProductsListParams,
  ProductUpdateInput,
} from '@/types/inventory'

export const inventoryKeys = {
  all: ['inventory'] as const,
  summary: () => [...inventoryKeys.all, 'summary'] as const,
  products: () => [...inventoryKeys.all, 'products'] as const,
  productList: (params: ProductsListParams) =>
    [...inventoryKeys.products(), 'list', params] as const,
  productDetail: (id: number) => [...inventoryKeys.products(), 'detail', id] as const,
  packaging: () => [...inventoryKeys.all, 'packaging'] as const,
  packagingList: (params: ProductPackagingListParams) =>
    [...inventoryKeys.packaging(), 'list', params] as const,
  packagingDetail: (id: number) => [...inventoryKeys.packaging(), 'detail', id] as const,
  ingredients: () => [...inventoryKeys.all, 'ingredients'] as const,
  ingredientList: (params: IngredientsListParams) =>
    [...inventoryKeys.ingredients(), 'list', params] as const,
  ingredientDetail: (id: number) => [...inventoryKeys.ingredients(), 'detail', id] as const,
  ingredientInventories: () => [...inventoryKeys.all, 'ingredient-inventory'] as const,
  ingredientInventoryList: (params: IngredientInventoryListParams) =>
    [...inventoryKeys.ingredientInventories(), 'list', params] as const,
  ingredientInventoryDetail: (id: number) =>
    [...inventoryKeys.ingredientInventories(), 'detail', id] as const,
  ingredientMovements: () => [...inventoryKeys.all, 'ingredient-movements'] as const,
  ingredientMovementList: (params: IngredientStockMovementListParams) =>
    [...inventoryKeys.ingredientMovements(), 'list', params] as const,
  productMovements: () => [...inventoryKeys.all, 'product-movements'] as const,
  productMovementList: (params: ProductStockMovementListParams) =>
    [...inventoryKeys.productMovements(), 'list', params] as const,
}

export function useInventorySummaryQuery() {
  return useQuery({
    queryKey: inventoryKeys.summary(),
    queryFn: fetchInventorySummary,
    staleTime: 30_000,
  })
}

export function useProductsQuery(params: ProductsListParams) {
  return useQuery({
    queryKey: inventoryKeys.productList(params),
    queryFn: () => fetchProducts(params),
    placeholderData: keepPreviousData,
  })
}

export function useProductQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.productDetail(id ?? 0),
    queryFn: () => fetchProduct(id!),
    enabled: enabled && id != null && id > 0,
  })
}

export function useProductPackagingListQuery(params: ProductPackagingListParams) {
  return useQuery({
    queryKey: inventoryKeys.packagingList(params),
    queryFn: () => fetchProductPackagingList(params),
    placeholderData: keepPreviousData,
  })
}

export function useProductPackagingQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.packagingDetail(id ?? 0),
    queryFn: () => fetchProductPackaging(id!),
    enabled: enabled && id != null && id > 0,
  })
}

export function useCreateProductMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductCreateInput) => createProduct(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.products() })
      void qc.invalidateQueries({ queryKey: inventoryKeys.summary() })
    },
  })
}

export function useUpdateProductMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductUpdateInput) => updateProduct(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.products() })
      void qc.invalidateQueries({ queryKey: inventoryKeys.productDetail(id) })
      void qc.invalidateQueries({ queryKey: inventoryKeys.summary() })
    },
  })
}

export function useDeleteProductMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.products() })
      void qc.invalidateQueries({ queryKey: inventoryKeys.packaging() })
      void qc.invalidateQueries({ queryKey: inventoryKeys.summary() })
    },
  })
}

export function useCreateProductPackagingMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductPackagingCreateInput) => createProductPackaging(input),
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.packaging() })
      void qc.invalidateQueries({ queryKey: inventoryKeys.productDetail(variables.product) })
      void qc.invalidateQueries({ queryKey: inventoryKeys.summary() })
    },
  })
}

export function useUpdateProductPackagingMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductPackagingUpdateInput) =>
      updateProductPackaging(id, input),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.packaging() })
      void qc.invalidateQueries({
        queryKey: inventoryKeys.productDetail(data.product),
      })
      void qc.invalidateQueries({ queryKey: inventoryKeys.packagingDetail(id) })
      void qc.invalidateQueries({ queryKey: inventoryKeys.summary() })
    },
  })
}

export function useDeleteProductPackagingMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: number; productId: number }) =>
      deleteProductPackaging(id),
    onSuccess: (_void, { productId }) => {
      void qc.invalidateQueries({ queryKey: inventoryKeys.packaging() })
      void qc.invalidateQueries({ queryKey: inventoryKeys.productDetail(productId) })
      void qc.invalidateQueries({ queryKey: inventoryKeys.summary() })
    },
  })
}

function invalidateAllInventory(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: inventoryKeys.all })
}

export function useIngredientsQuery(params: IngredientsListParams) {
  return useQuery({
    queryKey: inventoryKeys.ingredientList(params),
    queryFn: () => fetchIngredients(params),
    placeholderData: keepPreviousData,
  })
}

export function useIngredientQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.ingredientDetail(id ?? 0),
    queryFn: () => fetchIngredient(id!),
    enabled: enabled && id != null && id > 0,
  })
}

export function useIngredientInventoriesQuery(params: IngredientInventoryListParams) {
  return useQuery({
    queryKey: inventoryKeys.ingredientInventoryList(params),
    queryFn: () => fetchIngredientInventories(params),
    placeholderData: keepPreviousData,
  })
}

export function useIngredientInventoryQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: inventoryKeys.ingredientInventoryDetail(id ?? 0),
    queryFn: () => fetchIngredientInventory(id!),
    enabled: enabled && id != null && id > 0,
  })
}

export function useIngredientStockMovementsQuery(params: IngredientStockMovementListParams) {
  return useQuery({
    queryKey: inventoryKeys.ingredientMovementList(params),
    queryFn: () => fetchIngredientStockMovements(params),
    placeholderData: keepPreviousData,
  })
}

export function useProductStockMovementsQuery(params: ProductStockMovementListParams) {
  return useQuery({
    queryKey: inventoryKeys.productMovementList(params),
    queryFn: () => fetchProductStockMovements(params),
    placeholderData: keepPreviousData,
  })
}

export function useCreateIngredientMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IngredientCreateInput) => createIngredient(input),
    onSuccess: () => invalidateAllInventory(qc),
  })
}

export function useUpdateIngredientMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IngredientUpdateInput) => updateIngredient(id, input),
    onSuccess: () => {
      invalidateAllInventory(qc)
      void qc.invalidateQueries({ queryKey: inventoryKeys.ingredientDetail(id) })
    },
  })
}

export function useDeleteIngredientMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteIngredient(id),
    onSuccess: () => invalidateAllInventory(qc),
  })
}

export function useUpdateIngredientInventoryMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IngredientInventoryUpdateInput) =>
      updateIngredientInventory(id, input),
    onSuccess: () => {
      invalidateAllInventory(qc)
      void qc.invalidateQueries({ queryKey: inventoryKeys.ingredientInventoryDetail(id) })
    },
  })
}

export function useCreateIngredientStockMovementMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IngredientStockMovementCreateInput) =>
      createIngredientStockMovement(input),
    onSuccess: () => invalidateAllInventory(qc),
  })
}

export function useCreateProductStockMovementMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductStockMovementCreateInput) =>
      createProductStockMovement(input),
    onSuccess: () => invalidateAllInventory(qc),
  })
}
