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

export type SortValue = string | number | boolean | null | undefined

function compareSortValues(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0
  if (a == null || a === '') return 1
  if (b == null || b === '') return -1
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Number(Boolean(a)) - Number(Boolean(b))
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const as = String(a)
  const bs = String(b)
  const an = Number(as)
  const bn = Number(bs)
  if (as.trim() !== '' && bs.trim() !== '' && Number.isFinite(an) && Number.isFinite(bn)) {
    return an - bn
  }
  return as.localeCompare(bs, 'id', { numeric: true, sensitivity: 'base' })
}

export function sortRowsByOrdering<T>(
  rows: T[],
  ordering: string | undefined,
  getters: Record<string, (row: T) => SortValue>,
  defaultOrdering?: string
): T[] {
  const effective = resolveTableOrdering(ordering, defaultOrdering)
  if (!effective) return rows

  const tokens = effective
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
  if (!tokens.length) return rows

  return [...rows].sort((a, b) => {
    for (const token of tokens) {
      const desc = token.startsWith('-')
      const field = desc ? token.slice(1) : token
      const get = getters[field]
      if (!get) continue
      const cmp = compareSortValues(get(a), get(b))
      if (cmp !== 0) return desc ? -cmp : cmp
    }
    return 0
  })
}

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
