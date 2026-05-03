import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useProductStockMovementsQuery } from '@/hooks/use-inventory-query'
import { cn } from '@/lib/utils'
import type { ProductStockMovement, ProductStockMovementListParams, StockMovementType } from '@/types/inventory'

const PAGE_SIZES = [10, 20, 50] as const

const ORDERING_DEFAULT = '__default__' as const

const ORDERING: { value: string; label: string }[] = [
  { value: ORDERING_DEFAULT, label: 'Default (terbaru)' },
  { value: 'movement_at', label: 'Waktu mutasi terlama' },
  { value: '-movement_at', label: 'Waktu mutasi terbaru' },
  { value: '-created_at', label: 'Dicatat terbaru' },
  { value: 'quantity', label: 'Kuantitas terendah' },
  { value: '-quantity', label: 'Kuantitas tertinggi' },
]

function fmtQty(v: string) {
  const n = Number(v)
  if (Number.isNaN(n)) return v
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

function fmtDt(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function ProductStockMovementsTable() {
  const [params, setParams] = useState<ProductStockMovementListParams>({
    page: 1,
    page_size: 20,
  })
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isError, error, isFetching } = useProductStockMovementsQuery(params)

  const rows = data?.results ?? []
  const total = data?.count ?? 0
  const pageSize = params.page_size ?? 20
  const page = params.page ?? 1
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const runSearch = useCallback(() => {
    setParams((p) => ({
      ...p,
      page: 1,
      search: searchInput.trim() || undefined,
    }))
  }, [searchInput])

  const columns = useMemo<ColumnDef<ProductStockMovement>[]>(
    () => [
      {
        id: 'product',
        header: 'Produk / kemasan',
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.product_variant_name}</span>
            <span className="text-on-surface-variant block text-xs">
              {row.original.product_packaging_label}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'movement_type',
        header: 'Jenis',
        cell: ({ row }) =>
          row.original.movement_type === 'IN' ? (
            <Badge variant="default">Masuk</Badge>
          ) : (
            <Badge variant="secondary">Keluar</Badge>
          ),
      },
      {
        accessorKey: 'quantity',
        header: 'Qty utama',
        cell: ({ row }) => <span className="tabular-nums">{fmtQty(row.original.quantity)}</span>,
      },
      {
        accessorKey: 'bonus_quantity',
        header: 'Bonus',
        cell: ({ row }) => (
          <span className="tabular-nums">{fmtQty(row.original.bonus_quantity)}</span>
        ),
      },
      {
        accessorKey: 'total_increase_quantity',
        header: 'Total tambah',
        cell: ({ row }) => (
          <span className="tabular-nums">{fmtQty(row.original.total_increase_quantity)}</span>
        ),
      },
      {
        accessorKey: 'note',
        header: 'Catatan',
        cell: ({ row }) => (
          <span className="text-on-surface-variant max-w-[160px] truncate text-sm">
            {row.original.note || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'movement_at',
        header: 'Waktu mutasi',
        cell: ({ row }) => (
          <span className="text-sm whitespace-nowrap">{fmtDt(row.original.movement_at)}</span>
        ),
      },
    ],
    []
  )

  /* eslint-disable-next-line react-hooks/incompatible-library */
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  const movementFilter = params.movement_type ?? 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="relative max-w-md flex-1">
            <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Cari varian, label kemasan…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              className="border-outline-variant pr-3 pl-10"
            />
          </div>
          <Button type="button" variant="outline" onClick={runSearch} className="shrink-0">
            Cari
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={movementFilter}
          onValueChange={(v) =>
            setParams((p) => ({
              ...p,
              page: 1,
              movement_type: v === 'all' ? undefined : (v as StockMovementType),
            }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,12rem)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua jenis</SelectItem>
            <SelectItem value="IN">Masuk</SelectItem>
            <SelectItem value="OUT">Keluar</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={params.ordering ?? ORDERING_DEFAULT}
          onValueChange={(ordering) =>
            setParams((p) => ({
              ...p,
              page: 1,
              ordering: ordering === ORDERING_DEFAULT ? undefined : ordering,
            }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,15rem)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDERING.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(pageSize)}
          onValueChange={(v) =>
            setParams((p) => ({
              ...p,
              page: 1,
              page_size: Number(v),
            }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,8rem)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} / halaman
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          'border-outline-variant bg-surface-container-lowest ambient-shadow overflow-x-auto rounded-xl border',
          isFetching && 'opacity-90'
        )}
      >
        {isError ? (
          <p className="text-destructive p-6 text-sm">
            {(error as Error)?.message ?? 'Gagal memuat data.'}
          </p>
        ) : isLoading ? (
          <p className="text-on-surface-variant p-6 text-sm">Memuat…</p>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="border-outline-variant hover:bg-transparent">
                  {hg.headers.map((h) => (
                    <TableHead key={h.id} className="text-on-surface-variant whitespace-nowrap">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow className="border-outline-variant hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="text-on-surface-variant py-10 text-center text-sm"
                  >
                    Belum ada mutasi produk.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-outline-variant">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {total > 0 ? (
        <div className="text-on-surface-variant flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
          <span>
            Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
