import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  cancelPurchaseInOrder,
  cancelSalesOrder,
  createCustomer,
  createPurchaseInOrder,
  createSalesOrder,
  deleteCustomer,
  deletePurchaseInOrder,
  deleteSalesOrder,
  downloadSalesInvoicePdf,
  fetchCustomer,
  fetchCustomers,
  fetchPurchaseInOrder,
  fetchPurchaseInOrders,
  fetchSalesOrder,
  fetchSalesOrders,
  updateCustomer,
  updatePurchaseInOrder,
  updateSalesOrder,
  uploadPurchaseInPaymentProof,
  uploadSalesPaymentProof,
  verifyPurchaseInOrder,
  verifySalesOrder,
} from '@/api/purchase'
import type {
  CustomerUpdateInput,
  CustomersListParams,
  PurchaseInOrderCreateInput,
  PurchaseInOrderUpdateInput,
  PurchaseInOrdersListParams,
  SalesOrderCreateInput,
  SalesOrdersListParams,
  SalesOrderUpdateInput,
} from '@/types/purchase'

export const purchaseKeys = {
  all: ['purchase'] as const,
  customers: () => [...purchaseKeys.all, 'customers'] as const,
  customerList: (params: CustomersListParams) =>
    [...purchaseKeys.customers(), 'list', params] as const,
  customerDetail: (id: number) => [...purchaseKeys.customers(), 'detail', id] as const,
  purchaseIn: () => [...purchaseKeys.all, 'purchase-in'] as const,
  purchaseInList: (params: PurchaseInOrdersListParams) =>
    [...purchaseKeys.purchaseIn(), 'list', params] as const,
  purchaseInDetail: (id: number) => [...purchaseKeys.purchaseIn(), 'detail', id] as const,
  salesOrders: () => [...purchaseKeys.all, 'sales-orders'] as const,
  salesOrderList: (params: SalesOrdersListParams) =>
    [...purchaseKeys.salesOrders(), 'list', params] as const,
  salesOrderDetail: (id: number) =>
    [...purchaseKeys.salesOrders(), 'detail', id] as const,
}

function invalidatePurchaseQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: purchaseKeys.all })
}

export function useCustomersQuery(params: CustomersListParams) {
  return useQuery({
    queryKey: purchaseKeys.customerList(params),
    queryFn: () => fetchCustomers(params),
    placeholderData: keepPreviousData,
  })
}

export function useCustomerQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: purchaseKeys.customerDetail(id ?? 0),
    queryFn: () => fetchCustomer(id!),
    enabled: enabled && id != null && id > 0,
  })
}

function invalidateCustomerQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: purchaseKeys.customers() })
}

export function useCreateCustomerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => invalidateCustomerQueries(qc),
  })
}

export function useUpdateCustomerMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CustomerUpdateInput) => updateCustomer(id, input),
    onSuccess: (data) => {
      invalidateCustomerQueries(qc)
      void qc.invalidateQueries({ queryKey: purchaseKeys.customerDetail(data.id) })
    },
  })
}

export function useDeleteCustomerMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => invalidateCustomerQueries(qc),
  })
}

export function usePurchaseInOrdersQuery(params: PurchaseInOrdersListParams) {
  return useQuery({
    queryKey: purchaseKeys.purchaseInList(params),
    queryFn: () => fetchPurchaseInOrders(params),
    placeholderData: keepPreviousData,
  })
}

export function usePurchaseInOrderQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: purchaseKeys.purchaseInDetail(id ?? 0),
    queryFn: () => fetchPurchaseInOrder(id!),
    enabled: enabled && id != null && id > 0,
  })
}

export function useSalesOrdersQuery(params: SalesOrdersListParams) {
  return useQuery({
    queryKey: purchaseKeys.salesOrderList(params),
    queryFn: () => fetchSalesOrders(params),
    placeholderData: keepPreviousData,
  })
}

export function useSalesOrderQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: purchaseKeys.salesOrderDetail(id ?? 0),
    queryFn: () => fetchSalesOrder(id!),
    enabled: enabled && id != null && id > 0,
  })
}

export function useCreatePurchaseInOrderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PurchaseInOrderCreateInput) => createPurchaseInOrder(input),
    onSuccess: () => invalidatePurchaseQueries(qc),
  })
}

export function useUpdatePurchaseInOrderMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PurchaseInOrderUpdateInput) =>
      updatePurchaseInOrder(id, input),
    onSuccess: () => {
      invalidatePurchaseQueries(qc)
      void qc.invalidateQueries({ queryKey: purchaseKeys.purchaseInDetail(id) })
    },
  })
}

export function useDeletePurchaseInOrderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: number) => deletePurchaseInOrder(orderId),
    onSuccess: () => invalidatePurchaseQueries(qc),
  })
}

export function useUploadPurchasePaymentProofMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadPurchaseInPaymentProof(id, file),
    onSuccess: () => {
      invalidatePurchaseQueries(qc)
      void qc.invalidateQueries({ queryKey: purchaseKeys.purchaseInDetail(id) })
    },
  })
}

export function useVerifyPurchaseInOrderMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => verifyPurchaseInOrder(id),
    onSuccess: () => {
      invalidatePurchaseQueries(qc)
      void qc.invalidateQueries({ queryKey: purchaseKeys.purchaseInDetail(id) })
    },
  })
}

export function useCancelPurchaseInOrderMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => cancelPurchaseInOrder(id),
    onSuccess: () => {
      invalidatePurchaseQueries(qc)
      void qc.invalidateQueries({ queryKey: purchaseKeys.purchaseInDetail(id) })
    },
  })
}

export function useCreateSalesOrderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SalesOrderCreateInput) => createSalesOrder(input),
    onSuccess: () => invalidatePurchaseQueries(qc),
  })
}

export function useUpdateSalesOrderMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SalesOrderUpdateInput) => updateSalesOrder(id, input),
    onSuccess: () => {
      invalidatePurchaseQueries(qc)
      void qc.invalidateQueries({ queryKey: purchaseKeys.salesOrderDetail(id) })
    },
  })
}

export function useDeleteSalesOrderMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderId: number) => deleteSalesOrder(orderId),
    onSuccess: () => invalidatePurchaseQueries(qc),
  })
}

export function useUploadSalesPaymentProofMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadSalesPaymentProof(id, file),
    onSuccess: () => {
      invalidatePurchaseQueries(qc)
      void qc.invalidateQueries({ queryKey: purchaseKeys.salesOrderDetail(id) })
    },
  })
}

export function useVerifySalesOrderMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => verifySalesOrder(id),
    onSuccess: () => {
      invalidatePurchaseQueries(qc)
      void qc.invalidateQueries({ queryKey: purchaseKeys.salesOrderDetail(id) })
    },
  })
}

export function useCancelSalesOrderMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => cancelSalesOrder(id),
    onSuccess: () => {
      invalidatePurchaseQueries(qc)
      void qc.invalidateQueries({ queryKey: purchaseKeys.salesOrderDetail(id) })
    },
  })
}

export function useSalesInvoicePdfMutation() {
  return useMutation({
    mutationFn: (orderId: number) => downloadSalesInvoicePdf(orderId),
  })
}
