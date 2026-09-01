import { formatDecimalId, parseDecimalLike, salesOrderLinesTotalMassKg } from '@/lib/format-number-id'
import type { PackagingType } from '@/types/inventory'
import type { SalesOrder, SalesOrderLine } from '@/types/purchase'

/** Indonesian ons = 100 g = 0,1 kg. */
export const ONS_TO_KG = 0.1

export function formatKgId(kg: number): string {
  if (!Number.isFinite(kg)) return '—'
  return `${formatDecimalId(kg)} kg`
}

/** e.g. "1 kemasan = 0,1 kg (1 ons)". */
export function formatOneKemasanMass(netMassKg: string | number | undefined): string {
  const kg = parseDecimalLike(String(netMassKg ?? ''))
  if (!Number.isFinite(kg) || kg <= 0) return '—'
  const ons = Math.round((kg / ONS_TO_KG) * 1e6) / 1e6
  const kgPart = formatKgId(kg)
  if (!Number.isFinite(ons) || ons <= 0) return `1 kemasan = ${kgPart}`
  return `1 kemasan = ${kgPart} (${formatDecimalId(ons)} ons)`
}

export function productDisplayName(line: Pick<SalesOrderLine, 'product_name' | 'product_variant_name'>): string {
  const variant = line.product_variant_name?.trim() ?? ''
  const name = line.product_name?.trim() ?? ''
  if (name && variant && name !== variant) return `${name} ${variant}`
  return variant || name || '—'
}

export type PackingAggRow = {
  key: string
  productName: string
  packagingLabel: string
  packagingType?: PackagingType
  unitKg: number
  totalKg: number
}

export function aggregatePackingFromOrders(orders: SalesOrder[]): PackingAggRow[] {
  const map = new Map<string, PackingAggRow>()
  for (const order of orders) {
    if (order.status === 'CANCELLED') continue
    for (const line of order.lines ?? []) {
      const unitKg = parseDecimalLike(line.net_mass_kg ?? '0')
      const qty = parseDecimalLike(line.quantity)
      const addKg = Number.isFinite(qty) && Number.isFinite(unitKg) ? qty * unitKg : 0
      const key = `${line.product_packaging}:${line.packaging_label}`
      const existing = map.get(key)
      if (existing) {
        existing.totalKg += addKg
        continue
      }
      map.set(key, {
        key,
        productName: productDisplayName(line),
        packagingLabel: line.packaging_label,
        packagingType: line.packaging_type,
        unitKg: Number.isFinite(unitKg) ? unitKg : 0,
        totalKg: addKg,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.productName.localeCompare(b.productName, 'id') || a.unitKg - b.unitKg)
}

export function orderTotalMassKg(order: Pick<SalesOrder, 'lines'>): number {
  return salesOrderLinesTotalMassKg(order.lines ?? [])
}

/** kg → jumlah kemasan (3 desimal, sesuai API `quantity`). */
export function packageQtyFromKg(massKg: number, netMassKg: number): number {
  if (!Number.isFinite(massKg) || !Number.isFinite(netMassKg) || massKg <= 0 || netMassKg <= 0) {
    return Number.NaN
  }
  return Math.round((massKg / netMassKg) * 1000) / 1000
}

/** jumlah kemasan → kg. */
export function kgFromPackageQty(qty: number, netMassKg: number): number {
  if (!Number.isFinite(qty) || !Number.isFinite(netMassKg) || qty <= 0 || netMassKg <= 0) {
    return 0
  }
  return Math.round(qty * netMassKg * 1e6) / 1e6
}

export function formatKgInputValue(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return ''
  return String(Math.round(kg * 1e6) / 1e6)
}
