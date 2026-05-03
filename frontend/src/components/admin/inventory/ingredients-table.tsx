import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { IngredientDeleteModal } from '@/components/admin/inventory/ingredient-delete-modal'
import { STOCK_UNIT_LABEL } from '@/constants/stock-units'
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
import { useIngredientsQuery } from '@/hooks/use-inventory-query'
import { cn } from '@/lib/utils'
import type { Ingredient, IngredientsListParams } from '@/types/inventory'

const PAGE_SIZES = [10, 20, 50] as const

const ORDERING: { value: string; label: string }[] = [
  { value: 'name', label: 'Nama A–Z' },
  { value: '-name', label: 'Nama Z–A' },
  { value: '-created_at', label: 'Terbaru' },
  { value: 'created_at', label: 'Terlama' },
]

export function IngredientsTable() {
  const navigate = useNavigate()
  const [params, setParams] = useState<IngredientsListParams>({
    page: 1,
    page_size: 20,
    ordering: 'name',
  })
  const [searchInput, setSearchInput] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null)

  const { data, isLoading, isError, error, isFetching } = useIngredientsQuery(params)

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

  const columns = useMemo<ColumnDef<Ingredient>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nama bahan',
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'default_unit',
        header: 'Satuan',
        cell: ({ row }) => STOCK_UNIT_LABEL[row.original.default_unit] ?? row.original.default_unit,
      },
      {
        accessorKey: 'is_active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="default">Aktif</Badge>
          ) : (
            <Badge variant="secondary">Nonaktif</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const ing = row.original
          return (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 px-0"
                onClick={() => navigate(`/admin/gudang/bahan-baku/${ing.id}/edit`)}
                aria-label={`Edit ${ing.name}`}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive size-8 px-0"
                onClick={() => setDeleteTarget(ing)}
                aria-label={`Hapus ${ing.name}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )
        },
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
      <IngredientDeleteModal
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null)
        }}
        ingredient={deleteTarget}
      />

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
        <Button
          type="button"
          onClick={() => navigate('/admin/gudang/bahan-baku/baru')}
          className="shrink-0 gap-2"
        >
          <Plus className="size-4" />
          Tambah bahan
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={params.is_active === undefined ? 'all' : params.is_active ? 'true' : 'false'}
          onValueChange={(v) =>
            setParams((p) => ({
              ...p,
              page: 1,
              is_active: v === 'all' ? undefined : v === 'true',
            }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,12rem)]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="true">Aktif saja</SelectItem>
            <SelectItem value="false">Nonaktif saja</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={params.ordering ?? 'name'}
          onValueChange={(ordering) => setParams((p) => ({ ...p, page: 1, ordering }))}
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,14rem)]">
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
                    Belum ada bahan baku.
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
