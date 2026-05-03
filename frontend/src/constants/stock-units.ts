import type { StockUnit } from '@/types/inventory'

export const STOCK_UNIT_LABEL: Record<StockUnit, string> = {
  KG: 'Kilogram (kg)',
  L: 'Liter (L)',
  PCS: 'Buah / pcs',
}

export const STOCK_UNITS: readonly StockUnit[] = ['KG', 'L', 'PCS']
