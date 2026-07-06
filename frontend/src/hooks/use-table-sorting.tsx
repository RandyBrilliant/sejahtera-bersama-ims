import { useCallback } from 'react'

import { SortableColumnHeader } from '@/components/ui/sortable-column-header'
import {
  getSortDirection,
  toggleOrdering,
  type SortFieldConfig,
} from '@/lib/table-sorting'

type UseTableSortingOptions = {
  ordering?: string
  defaultOrdering?: string
  onOrderingChange: (ordering: string) => void
}

export function useTableSorting({
  ordering,
  defaultOrdering,
  onOrderingChange,
}: UseTableSortingOptions) {
  const handleSort = useCallback(
    (config: SortFieldConfig, options?: { preferDesc?: boolean }) => {
      onOrderingChange(
        toggleOrdering(ordering, config, {
          defaultOrdering,
          preferDesc: options?.preferDesc,
        })
      )
    },
    [ordering, defaultOrdering, onOrderingChange]
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
