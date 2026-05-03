import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  createOperationalCashEntry,
  createOperationalCategory,
  deleteOperationalCashEntry,
  deleteOperationalCategory,
  fetchOperationalCashEntries,
  fetchOperationalCashEntry,
  fetchOperationalCategories,
  fetchOperationalCategory,
  updateOperationalCashEntry,
  updateOperationalCategory,
  uploadOperationalCashEntryAttachment,
} from '@/api/expenses'
import type {
  OperationalCashEntryListParams,
  OperationalCashEntryUpdateInput,
  OperationalCategoryListParams,
  OperationalCategoryUpdateInput,
} from '@/types/expenses'

export const expensesKeys = {
  all: ['expenses'] as const,
  categories: () => [...expensesKeys.all, 'categories'] as const,
  categoryList: (params: OperationalCategoryListParams) =>
    [...expensesKeys.categories(), 'list', params] as const,
  categoryDetail: (id: number) => [...expensesKeys.categories(), 'detail', id] as const,
  entries: () => [...expensesKeys.all, 'entries'] as const,
  entryList: (params: OperationalCashEntryListParams) =>
    [...expensesKeys.entries(), 'list', params] as const,
  entryDetail: (id: number) => [...expensesKeys.entries(), 'detail', id] as const,
}

function invalidateExpensesAll(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: expensesKeys.all })
}

export function useOperationalCategoriesQuery(params: OperationalCategoryListParams) {
  return useQuery({
    queryKey: expensesKeys.categoryList(params),
    queryFn: () => fetchOperationalCategories(params),
    placeholderData: keepPreviousData,
  })
}

export function useOperationalCategoryQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: expensesKeys.categoryDetail(id ?? 0),
    queryFn: () => fetchOperationalCategory(id!),
    enabled: enabled && id != null && id > 0,
  })
}

export function useCreateOperationalCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOperationalCategory,
    onSuccess: () => invalidateExpensesAll(qc),
  })
}

export function useUpdateOperationalCategoryMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: OperationalCategoryUpdateInput) =>
      updateOperationalCategory(id, input),
    onSuccess: () => {
      invalidateExpensesAll(qc)
      void qc.invalidateQueries({ queryKey: expensesKeys.categoryDetail(id) })
    },
  })
}

export function useDeleteOperationalCategoryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteOperationalCategory,
    onSuccess: () => invalidateExpensesAll(qc),
  })
}

export function useOperationalCashEntriesQuery(params: OperationalCashEntryListParams) {
  return useQuery({
    queryKey: expensesKeys.entryList(params),
    queryFn: () => fetchOperationalCashEntries(params),
    placeholderData: keepPreviousData,
  })
}

export function useOperationalCashEntryQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: expensesKeys.entryDetail(id ?? 0),
    queryFn: () => fetchOperationalCashEntry(id!),
    enabled: enabled && id != null && id > 0,
  })
}

export function useCreateOperationalCashEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOperationalCashEntry,
    onSuccess: () => invalidateExpensesAll(qc),
  })
}

export function useUpdateOperationalCashEntryMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: OperationalCashEntryUpdateInput) =>
      updateOperationalCashEntry(id, input),
    onSuccess: () => {
      invalidateExpensesAll(qc)
      void qc.invalidateQueries({ queryKey: expensesKeys.entryDetail(id) })
    },
  })
}

export function useDeleteOperationalCashEntryMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteOperationalCashEntry,
    onSuccess: () => invalidateExpensesAll(qc),
  })
}

export function useUploadOperationalCashEntryAttachmentMutation(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadOperationalCashEntryAttachment(id, file),
    onSuccess: () => {
      invalidateExpensesAll(qc)
      void qc.invalidateQueries({ queryKey: expensesKeys.entryDetail(id) })
    },
  })
}
