import { useCallback, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { ProductPackagingDeleteModal } from '@/components/admin/inventory/product-packaging-delete-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DEFAULT_TABLE_PAGE_SIZE } from '@/constants/table-pagination'
import { useProductPackagingListQuery } from '@/hooks/use-inventory-query'
import { useTableSorting } from '@/hooks/use-table-sorting'
import { formatIdr } from '@/lib/format-idr'
import type { ProductPackaging, ProductPackagingListParams } from '@/types/inventory'

type Props = {
  productId: number
}

function fmtStock(v: string) {
  const n = Number(v)
  if (Number.isNaN(n)) return v
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

function fmtKg(v: string) {
  const n = Number(String(v).replace(',', '.'))
  if (Number.isNaN(n)) return v
  return n.toLocaleString('id-ID', { maximumFractionDigits: 6 })
}

export function ProductPackagingInlineTable({ productId }: Props) {
  const navigate = useNavigate()
  const [deleteRow, setDeleteRow] = useState<ProductPackaging | null>(null)
  const [listParams, setListParams] = useState<ProductPackagingListParams>({
    product: productId,
    page_size: DEFAULT_TABLE_PAGE_SIZE,
    ordering: 'label',
  })

  const onOrderingChange = useCallback(
    (ordering: string) => setListParams((p) => ({ ...p, ordering })),
    []
  )

  const { sortHeader } = useTableSorting({
    ordering: listParams.ordering,
    defaultOrdering: 'label',
    onOrderingChange,
  })

  const { data, isLoading, isError } = useProductPackagingListQuery(listParams)

  const rows = data?.results ?? []

  return (
    <div className="space-y-3">
      <ProductPackagingDeleteModal
        open={!!deleteRow}
        onOpenChange={(o) => {
          if (!o) setDeleteRow(null)
        }}
        row={deleteRow}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-on-surface font-heading text-lg font-semibold">Kemasan (SKU)</h2>
        <Button
          type="button"
          size="sm"
          className="gap-2"
          onClick={() => navigate(`/admin/inventaris/${productId}/kemasan/baru`)}
        >
          <Plus className="size-4" />
          Tambah kemasan
        </Button>
      </div>

      {isError ? (
        <p className="text-destructive text-sm">Gagal memuat kemasan.</p>
      ) : isLoading ? (
        <p className="text-on-surface-variant text-sm">Memuat kemasan…</p>
      ) : rows.length === 0 ? (
        <p className="text-on-surface-variant text-sm">
          Belum ada kemasan.{' '}
          <button
            type="button"
            className="text-primary font-medium underline"
            onClick={() => navigate(`/admin/inventaris/${productId}/kemasan/baru`)}
          >
            Tambah kemasan pertama
          </button>
        </p>
      ) : (
        <div className="border-outline-variant ambient-shadow overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="border-outline-variant hover:bg-transparent">
                <TableHead className="text-on-surface-variant">
                  {sortHeader('Label', 'label')}
                </TableHead>
                <TableHead className="text-on-surface-variant">
                  {sortHeader('Berat (kg)', 'net_mass_kg')}
                </TableHead>
                <TableHead className="text-on-surface-variant">
                  {sortHeader('Setara unit kemasan', 'remaining_stock')}
                </TableHead>
                <TableHead className="text-on-surface-variant">
                  {sortHeader('Harga pokok', 'base_price_idr')}
                </TableHead>
                <TableHead className="text-on-surface-variant">
                  {sortHeader('Harga jual', 'list_price_idr')}
                </TableHead>
                <TableHead className="text-on-surface-variant">
                  {sortHeader('SKU', 'sku')}
                </TableHead>
                <TableHead className="text-on-surface-variant">
                  {sortHeader('Status', 'is_active')}
                </TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="border-outline-variant">
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="tabular-nums">{fmtKg(row.net_mass_kg)}</TableCell>
                  <TableCell className="tabular-nums">{fmtStock(row.remaining_stock)}</TableCell>
                  <TableCell className="tabular-nums">{formatIdr(row.base_price_idr)}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.list_price_idr != null ? formatIdr(row.list_price_idr) : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.sku || '—'}</TableCell>
                  <TableCell>
                    {row.is_active ? (
                      <Badge variant="default">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-8 px-0"
                        asChild
                      >
                        <Link
                          to={`/admin/inventaris/kemasan/${row.id}/edit`}
                          aria-label={`Edit kemasan ${row.label}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive size-8 px-0"
                        onClick={() => setDeleteRow(row)}
                        aria-label={`Hapus kemasan ${row.label}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
