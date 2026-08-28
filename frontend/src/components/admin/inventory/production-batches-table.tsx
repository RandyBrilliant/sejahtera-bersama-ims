import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/date-picker-input'
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
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from '@/constants/table-pagination'
import { useProductionBatchesQuery } from '@/hooks/use-inventory-query'
import { useTableSorting } from '@/hooks/use-table-sorting'
import { createOrderingChangeHandler } from '@/lib/table-sorting'
import { cn } from '@/lib/utils'
import type { ProductionBatch, ProductionBatchesListParams } from '@/types/inventory'

function fmtQty(v: string) {
  const n = Number(v)
  if (Number.isNaN(n)) return v
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { dateStyle: 'medium' })
}

export function ProductionBatchesTable() {
  const [params, setParams] = useState<ProductionBatchesListParams>({
    page: 1,
    page_size: DEFAULT_TABLE_PAGE_SIZE,
    ordering: '-production_date,-id',
  })
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isError, isFetching } = useProductionBatchesQuery(params)

  const rows = data?.results ?? []
  const total = data?.count ?? 0
  const pageSize = params.page_size ?? DEFAULT_TABLE_PAGE_SIZE
  const page = params.page ?? 1
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const runSearch = useCallback(() => {
    setParams((p) => ({
      ...p,
      page: 1,
      search: searchInput.trim() || undefined,
    }))
  }, [searchInput])

  const onOrderingChange = useMemo(() => createOrderingChangeHandler(setParams), [])

  const { sortHeader } = useTableSorting({
    ordering: params.ordering,
    defaultOrdering: '-production_date,-id',
    onOrderingChange,
  })

  const columns = useMemo<ColumnDef<ProductionBatch>[]>(
    () => [
      {
        accessorKey: 'production_date',
        header: () => sortHeader('Tanggal', 'production_date', { preferDesc: true }),
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">
            {fmtDate(row.original.production_date)}
          </span>
        ),
      },
      {
        accessorKey: 'shift_label',
        header: 'Shift',
        cell: ({ row }) => row.original.shift_label || '—',
      },
      {
        accessorKey: 'total_ingredient_used',
        header: 'Bahan dipakai',
        cell: ({ row }) => (
          <span className="tabular-nums">{fmtQty(row.original.total_ingredient_used)}</span>
        ),
      },
      {
        accessorKey: 'total_product_packages',
        header: 'Output kemasan',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {fmtQty(row.original.total_product_packages)}
            {Number(row.original.total_bonus_packages) > 0
              ? ` (+${fmtQty(row.original.total_bonus_packages)} bonus)`
              : ''}
          </span>
        ),
      },
      {
        accessorKey: 'note',
        header: 'Catatan',
        cell: ({ row }) => (
          <span className="text-on-surface-variant max-w-[180px] truncate text-sm">
            {row.original.note || '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="size-8 px-0" asChild>
              <Link
                to={`/admin/gudang/produksi/${row.original.id}`}
                aria-label={`Detail batch ${row.original.id}`}
              >
                <Eye className="size-4" />
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    [sortHeader]
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
          <div className="relative min-w-0 flex-1">
            <Search className="text-on-surface-variant absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchInput}
              autoComplete="off"
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch()
              }}
              placeholder="Cari shift / catatan…"
              className="border-outline-variant pl-9"
            />
          </div>
          <Button type="button" variant="outline" onClick={runSearch}>
            Cari
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <span className="text-on-surface-variant text-xs">Dari</span>
            <DatePickerInput
              value={params.production_date_from ?? ''}
              onChange={(v) =>
                setParams((p) => ({
                  ...p,
                  page: 1,
                  production_date_from: v || undefined,
                }))
              }
            />
          </div>
          <div className="grid gap-1">
            <span className="text-on-surface-variant text-xs">Sampai</span>
            <DatePickerInput
              value={params.production_date_to ?? ''}
              onChange={(v) =>
                setParams((p) => ({
                  ...p,
                  page: 1,
                  production_date_to: v || undefined,
                }))
              }
            />
          </div>
        </div>
      </div>

      {isError ? (
        <p className="text-destructive text-sm">Gagal memuat batch produksi.</p>
      ) : null}

      <div
        className={cn(
          'border-outline-variant ambient-shadow overflow-hidden rounded-xl border',
          isFetching && 'opacity-80'
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-outline-variant hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-on-surface-variant">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-on-surface-variant h-24 text-center">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-on-surface-variant h-24 text-center">
                  Belum ada batch produksi.
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
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-on-surface-variant text-sm">
          {total.toLocaleString('id-ID')} batch · halaman {page}/{totalPages}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) =>
              setParams((p) => ({ ...p, page: 1, page_size: Number(v) }))
            }
          >
            <SelectTrigger className="border-outline-variant w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}/hal
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setParams((p) => ({ ...p, page: Math.max(1, (p.page ?? 1) - 1) }))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              setParams((p) => ({ ...p, page: Math.min(totalPages, (p.page ?? 1) + 1) }))
            }
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
