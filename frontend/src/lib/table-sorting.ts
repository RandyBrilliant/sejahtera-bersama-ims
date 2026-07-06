import type { Dispatch, SetStateAction } from 'react'

export type SortFieldConfig =
  | string
  | {
      field: string
      asc?: string
      desc?: string
    }

function resolveConfig(config: SortFieldConfig) {
  if (typeof config === 'string') {
    return { field: config, asc: config, desc: `-${config}` }
  }
  return {
    field: config.field,
    asc: config.asc ?? config.field,
    desc: config.desc ?? `-${config.field}`,
  }
}

function primaryToken(ordering: string) {
  return ordering.split(',')[0]?.trim() ?? ''
}

export function resolveTableOrdering(
  ordering: string | undefined,
  defaultOrdering?: string
): string | undefined {
  const trimmed = ordering?.trim()
  if (trimmed) return trimmed
  const fallback = defaultOrdering?.trim()
  return fallback || undefined
}

export function getSortDirection(
  ordering: string | undefined,
  config: SortFieldConfig,
  defaultOrdering?: string
): 'asc' | 'desc' | null {
  const { asc, desc, field } = resolveConfig(config)
  const effective = resolveTableOrdering(ordering, defaultOrdering)
  if (!effective) return null

  if (effective === asc) return 'asc'
  if (effective === desc) return 'desc'

  const primary = primaryToken(effective)
  if (!primary) return null

  const ascPrimary = primaryToken(asc)
  const descPrimary = primaryToken(desc)

  if (primary === ascPrimary || primary === field) return 'asc'
  if (primary === descPrimary || primary === `-${field}`) return 'desc'

  return null
}

export function toggleOrdering(
  current: string | undefined,
  config: SortFieldConfig,
  options?: { defaultOrdering?: string; preferDesc?: boolean }
): string {
  const { asc, desc } = resolveConfig(config)
  const dir = getSortDirection(current, config, options?.defaultOrdering)
  if (dir === 'asc') return desc
  if (dir === 'desc') return asc
  return options?.preferDesc ? desc : asc
}

export type OrderingChangeHandler = (
  next: string | ((current: string | undefined) => string)
) => void

export function createOrderingChangeHandler<T extends { page?: number; ordering?: string }>(
  setParams: Dispatch<SetStateAction<T>>,
  options?: { resetPage?: boolean }
): OrderingChangeHandler {
  const resetPage = options?.resetPage ?? true
  return (next) => {
    setParams((params) => ({
      ...params,
      ...(resetPage ? { page: 1 } : {}),
      ordering: typeof next === 'function' ? next(params.ordering) : next,
    }))
  }
}
