import type { InventoryRangeRecapPayload } from '@/types/inventory'
import type {
  OperationalCashFullReportPayload,
  SalesRevenueReportPayload,
} from '@/types/reports'

import { toFiniteNumber } from '@/lib/format-idr'

type Row = (string | number | null | undefined)[]

function salesRevenueDetailRows(revenue: SalesRevenueReportPayload): Row[] {
  const rows: Row[] = []
  rows.push(['Ringkasan'])
  rows.push(['Order terverifikasi', revenue.summary.verified_order_count])
  rows.push(['Total pendapatan (IDR)', toFiniteNumber(revenue.summary.total_revenue_idr)])
  rows.push(['Total subtotal (IDR)', toFiniteNumber(revenue.summary.total_subtotal_idr ?? 0)])
  rows.push(['Total pajak (IDR)', toFiniteNumber(revenue.summary.total_tax_idr ?? 0)])
  rows.push([])
  rows.push(['Per pelanggan', 'Jumlah order', 'Pendapatan (IDR)'])
  for (const r of revenue.by_customer) {
    rows.push([r.customer__name, r.orders, toFiniteNumber(r.revenue_idr)])
  }
  rows.push([])
  rows.push([
    'Varian produk',
    'Label kemasan',
    'Qty terjual',
    'Pendapatan baris (IDR)',
  ])
  for (const r of revenue.by_packaging) {
    rows.push([
      r.product_packaging__product__variant_name,
      r.product_packaging__label,
      String(r.total_quantity),
      toFiniteNumber(r.revenue_idr),
    ])
  }
  return rows
}

function productionDetailRows(production: InventoryRangeRecapPayload): Row[] {
  const s = production.summary
  const rows: Row[] = []
  rows.push(['Ringkasan'])
  rows.push(['Total batch produksi', s.total_batches])
  rows.push(['Total bahan terpakai (qty)', String(s.total_ingredients_used)])
  rows.push(['Total kemasan diproduksi', String(s.total_packages_produced)])
  rows.push(['Total bonus kemasan', String(s.total_bonus_packages)])
  rows.push(['Total output kemasan', String(s.total_packages_output)])
  rows.push(['Estimasi nilai produksi (IDR)', toFiniteNumber(s.estimated_production_value_idr)])
  rows.push([])
  rows.push(['Bahan', 'Unit', 'Total terpakai'])
  for (const r of production.ingredient_usage) {
    rows.push([r.ingredient_name, r.unit, String(r.total_used)])
  }
  rows.push([])
  rows.push([
    'Varian',
    'Label kemasan',
    'Harga dasar (IDR)',
    'Produksi',
    'Bonus',
    'Output',
    'Estimasi nilai (IDR)',
  ])
  for (const r of production.packaging_output) {
    rows.push([
      r.variant_name,
      r.packaging_label,
      r.base_price_idr,
      String(r.total_produced),
      String(r.total_bonus),
      String(r.total_output),
      toFiniteNumber(r.estimated_value_idr),
    ])
  }
  return rows
}

export function buildSalesRevenueCsvRows(revenue: SalesRevenueReportPayload): Row[] {
  return [
    ['Laporan pendapatan penjualan (order terverifikasi)'],
    ['Periode', `${revenue.start_date} s/d ${revenue.end_date}`],
    [],
    ...salesRevenueDetailRows(revenue),
  ]
}

export function buildProductionRecapCsvRows(production: InventoryRangeRecapPayload): Row[] {
  return [
    ['Rekap produksi & pemakaian bahan'],
    ['Periode', `${production.start_date} s/d ${production.end_date}`],
    [],
    ...productionDetailRows(production),
  ]
}

/** Satu berkas CSV multi-bagian untuk dibuka di Excel. */
export function buildCombinedAnalyticsCsvRows(
  start: string,
  end: string,
  cash: OperationalCashFullReportPayload | undefined,
  revenue: SalesRevenueReportPayload | undefined,
  production: InventoryRangeRecapPayload | undefined
): Row[] {
  const rows: Row[] = []
  rows.push(['Laporan analitik gabungan'])
  rows.push(['Periode', `${start} s/d ${end}`])
  rows.push([])

  if (cash) {
    rows.push(['=== KAS OPERASIONAL ==='])
    rows.push(['Pemasukan (IDR)', toFiniteNumber(cash.income.total_idr)])
    rows.push(['Baris pemasukan', cash.income.line_count])
    rows.push(['Pengeluaran (IDR)', toFiniteNumber(cash.expense.total_idr)])
    rows.push(['Baris pengeluaran', cash.expense.line_count])
    rows.push(['Net kas (IDR)', cash.net_cash_idr])
    rows.push([])
    rows.push(['Kategori', 'Arah', 'Total (IDR)', 'Baris'])
    for (const c of cash.by_category) {
      rows.push([c.category__name, c.direction, toFiniteNumber(c.total_idr), c.lines])
    }
    rows.push([])
  } else {
    rows.push(['=== KAS OPERASIONAL ===', '(data tidak tersedia atau akses ditolak)'])
    rows.push([])
  }

  if (revenue) {
    rows.push(['=== PENDAPATAN PENJUALAN ==='])
    rows.push(...salesRevenueDetailRows(revenue))
    rows.push([])
  } else {
    rows.push(['=== PENDAPATAN PENJUALAN ===', '(data tidak tersedia atau akses ditolak)'])
    rows.push([])
  }

  if (production) {
    rows.push(['=== PRODUKSI / INVENTORY ==='])
    rows.push(...productionDetailRows(production))
  } else {
    rows.push(['=== PRODUKSI / INVENTORY ===', '(data tidak tersedia atau akses ditolak)'])
  }

  return rows
}
