import { Navigate, useParams } from 'react-router-dom'

import { PageBackLink } from '@/components/navigation/page-back-link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { STOCK_UNIT_LABEL } from '@/constants/stock-units'
import { useProductionBatchQuery } from '@/hooks/use-inventory-query'
import type { StockUnit } from '@/types/inventory'

const LIST_PATH = '/admin/gudang/produksi'

function fmtQty(v: string) {
  const n = Number(v)
  if (Number.isNaN(n)) return v
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { dateStyle: 'full' })
}

function unitLabel(unit: string) {
  return STOCK_UNIT_LABEL[unit as StockUnit] ?? unit
}

export function AdminProductionBatchDetailPage() {
  const { batchId: idParam } = useParams<{ batchId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0
  const { data: batch, isLoading, isError } = useProductionBatchQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat batch…</p>
  }

  if (isError || !batch) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={LIST_PATH} className="mb-0">
          ← Kembali ke daftar
        </PageBackLink>
        <p className="text-destructive text-sm">Batch produksi tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar produksi</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Batch #{batch.id}
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          {fmtDate(batch.production_date)}
          {batch.shift_label ? ` · ${batch.shift_label}` : ''}
          {batch.note ? ` — ${batch.note}` : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-outline-variant ambient-shadow rounded-xl border p-4">
          <p className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
            Bahan dipakai
          </p>
          <p className="text-on-surface font-heading mt-1 text-xl font-semibold tabular-nums">
            {fmtQty(batch.total_ingredient_used)}
          </p>
        </div>
        <div className="border-outline-variant ambient-shadow rounded-xl border p-4">
          <p className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
            Output utama
          </p>
          <p className="text-on-surface font-heading mt-1 text-xl font-semibold tabular-nums">
            {fmtQty(batch.total_product_packages)}
          </p>
        </div>
        <div className="border-outline-variant ambient-shadow rounded-xl border p-4">
          <p className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
            Bonus
          </p>
          <p className="text-on-surface font-heading mt-1 text-xl font-semibold tabular-nums">
            {fmtQty(batch.total_bonus_packages)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-on-surface font-heading text-lg font-semibold">Pemakaian bahan</h2>
        <div className="border-outline-variant ambient-shadow overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="border-outline-variant hover:bg-transparent">
                <TableHead>Bahan</TableHead>
                <TableHead>Kuantitas</TableHead>
                <TableHead>Satuan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.ingredient_usages.map((row) => (
                <TableRow key={row.id} className="border-outline-variant">
                  <TableCell className="font-medium">{row.ingredient_name}</TableCell>
                  <TableCell className="tabular-nums">{fmtQty(row.quantity_used)}</TableCell>
                  <TableCell>{unitLabel(row.unit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-on-surface font-heading text-lg font-semibold">Hasil kemasan</h2>
        <div className="border-outline-variant ambient-shadow overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="border-outline-variant hover:bg-transparent">
                <TableHead>Varian</TableHead>
                <TableHead>Kemasan</TableHead>
                <TableHead>Utama</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Total masuk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.packaging_outputs.map((row) => (
                <TableRow key={row.id} className="border-outline-variant">
                  <TableCell className="font-medium">{row.product_variant_name}</TableCell>
                  <TableCell>{row.packaging_label}</TableCell>
                  <TableCell className="tabular-nums">{fmtQty(row.quantity_produced)}</TableCell>
                  <TableCell className="tabular-nums">{fmtQty(row.bonus_quantity)}</TableCell>
                  <TableCell className="tabular-nums">{fmtQty(row.total_quantity_in)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
