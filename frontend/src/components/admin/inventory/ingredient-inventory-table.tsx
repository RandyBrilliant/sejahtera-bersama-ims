import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Pencil, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
import { STOCK_UNIT_LABEL } from '@/constants/stock-units'
import { useIngredientInventoriesQuery } from '@/hooks/use-inventory-query'
import { cn } from '@/lib/utils'
import type { IngredientInventory, IngredientInventoryListParams } from '@/types/inventory'

const PAGE_SIZES = [10, 20, 50] as const

const ORDERING_DEFAULT = '__default__' as const

const ORDERING: { value: string; label: string }[] = [
  { value: ORDERING_DEFAULT, label: 'Default (nama bahan)' },
  { value: 'remaining_stock', label: 'Stok sisa terendah' },
  { value: '-remaining_stock', label: 'Stok sisa tertinggi' },
  { value: 'minimum_stock', label: 'Minimum terendah' },
  { value: '-updated_at', label: 'Pembaruan terbaru' },
]

function fmtQty(v: string) {
  const n = Number(v)
  if (Number.isNaN(n)) return v
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

export function IngredientInventoryTable() {
  const navigate = useNavigate()
  const [params, setParams] = useState<IngredientInventoryListParams>({
    page: 1,
    page_size: 20,
  })
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isError, error, isFetching } = useIngredientInventoriesQuery(params)

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

  const columns = useMemo<ColumnDef<IngredientInventory>[]>(
    () => [
      {
        accessorKey: 'ingredient_name',
        header: 'Bahan',
        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.ingredient_name}</span>
            <span className="text-on-surface-variant ml-2 text-xs">
              ({STOCK_UNIT_LABEL[row.original.ingredient_unit] ?? row.original.ingredient_unit})
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'remaining_stock',
        header: 'Stok sisa',
        cell: ({ row }) => (
          <span className="tabular-nums">{fmtQty(row.original.remaining_stock)}</span>
        ),
      },
      {
        accessorKey: 'minimum_stock',
        header: 'Minimum',
        cell: ({ row }) => (
          <span className="tabular-nums">{fmtQty(row.original.minimum_stock)}</span>
        ),
      },
      {
        accessorKey: 'is_below_minimum',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_below_minimum ? (
            <Badge variant="destructive">Di bawah minimum</Badge>
          ) : (
            <Badge variant="secondary">Aman</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-8 px-0"
              onClick={() =>
                navigate(`/admin/gudang/stok-bahan/${row.original.id}/edit`)
              }
              aria-label={`Edit stok ${row.original.ingredient_name}`}
            >
              <Pencil className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [navigate]
  )

  /* eslint-disable-next-line react-hooks/incompatible-library */
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="relative max-w-md flex-1">
            <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Cari nama bahan…"
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
          value={
            params.is_below_minimum === undefined
              ? 'all'
              : params.is_below_minimum
                ? 'below'
                : 'ok'
          }
          onValueChange={(v) =>
            setParams((p) => ({
              ...p,
              page: 1,
              is_below_minimum:
                v === 'all' ? undefined : v === 'below',
            }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,14rem)]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua baris</SelectItem>
            <SelectItem value="below">Di bawah minimum saja</SelectItem>
            <SelectItem value="ok">Stok aman saja</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={params.ordering ?? ORDERING_DEFAULT}
          onValueChange={(ordering) =>
            setParams((p) => ({
              ...p,
              page: 1,
              ordering:
                ordering === ORDERING_DEFAULT ? undefined : ordering,
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
          'border-outline-variant bg-surface-container-lowest ambient-shadow rounded-xl border',
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
                    <TableHead key={h.id} className="text-on-surface-variant">
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
                    Belum ada baris stok bahan.
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
