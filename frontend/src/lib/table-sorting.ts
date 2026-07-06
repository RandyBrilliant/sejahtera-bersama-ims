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

export function getSortDirection(
  ordering: string | undefined,
  config: SortFieldConfig,
  defaultOrdering?: string
): 'asc' | 'desc' | null {
  const { asc, desc } = resolveConfig(config)
  const effective = ordering ?? defaultOrdering
  if (!effective) return null
  if (effective === asc) return 'asc'
  if (effective === desc) return 'desc'
  const primary = effective.split(',')[0]
  const field = typeof config === 'string' ? config : config.field
  if (primary === field) return 'asc'
  if (primary === `-${field}`) return 'desc'
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
