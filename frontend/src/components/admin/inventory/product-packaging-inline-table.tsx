import { useState } from 'react'
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
import { useProductPackagingListQuery } from '@/hooks/use-inventory-query'
import { formatIdr } from '@/lib/format-idr'
import type { ProductPackaging } from '@/types/inventory'

type Props = {
  productId: number
}

function fmtStock(v: string) {
  const n = Number(v)
  if (Number.isNaN(n)) return v
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

export function ProductPackagingInlineTable({ productId }: Props) {
  const navigate = useNavigate()
  const [deleteRow, setDeleteRow] = useState<ProductPackaging | null>(null)

  const { data, isLoading, isError } = useProductPackagingListQuery({
    product: productId,
    page_size: 100,
    ordering: 'net_mass_grams',
  })

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
                <TableHead className="text-on-surface-variant">Label</TableHead>
                <TableHead className="text-on-surface-variant">Berat (g)</TableHead>
                <TableHead className="text-on-surface-variant">Stok</TableHead>
                <TableHead className="text-on-surface-variant">Harga pokok</TableHead>
                <TableHead className="text-on-surface-variant">Harga jual</TableHead>
                <TableHead className="text-on-surface-variant">SKU</TableHead>
                <TableHead className="text-on-surface-variant">Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="border-outline-variant">
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="tabular-nums">{row.net_mass_grams}</TableCell>
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
