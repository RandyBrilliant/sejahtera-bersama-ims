import { useCallback, useMemo, useState } from 'react'

import { SortableColumnHeader } from '@/components/ui/sortable-column-header'
import {
  getSortDirection,
  sortRowsByOrdering,
  toggleOrdering,
  type OrderingChangeHandler,
  type SortFieldConfig,
  type SortValue,
} from '@/lib/table-sorting'

type UseTableSortingOptions = {
  ordering?: string
  defaultOrdering?: string
  onOrderingChange: OrderingChangeHandler
}

export function useTableSorting({
  ordering,
  defaultOrdering,
  onOrderingChange,
}: UseTableSortingOptions) {
  const handleSort = useCallback(
    (config: SortFieldConfig, options?: { preferDesc?: boolean }) => {
      onOrderingChange((current) =>
        toggleOrdering(current, config, {
          defaultOrdering,
          preferDesc: options?.preferDesc,
        })
      )
    },
    [defaultOrdering, onOrderingChange]
  )

  const sortHeader = useCallback(
    (
      label: string,
      config: SortFieldConfig,
      options?: { preferDesc?: boolean; className?: string }
    ) => (
      <SortableColumnHeader
        label={label}
        direction={getSortDirection(ordering, config, defaultOrdering)}
        onClick={() => handleSort(config, options)}
        className={options?.className}
      />
    ),
    [ordering, defaultOrdering, handleSort]
  )

  return { sortHeader, handleSort }
}

type UseLocalTableSortingOptions<T> = {
  rows: T[]
  defaultOrdering: string
  getters: Record<string, (row: T) => SortValue>
}

export function useLocalTableSorting<T>({
  rows,
  defaultOrdering,
  getters,
}: UseLocalTableSortingOptions<T>) {
  const [ordering, setOrdering] = useState(defaultOrdering)

  const onOrderingChange = useCallback<OrderingChangeHandler>((next) => {
    setOrdering((current) => (typeof next === 'function' ? next(current) : next))
  }, [])

  const { sortHeader } = useTableSorting({
    ordering,
    defaultOrdering,
    onOrderingChange,
  })

  const sortedRows = useMemo(
    () => sortRowsByOrdering(rows, ordering, getters, defaultOrdering),
    [defaultOrdering, getters, ordering, rows]
  )

  return { sortHeader, sortedRows, ordering }
}
