import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ProductDeleteModal } from '@/components/admin/inventory/product-delete-modal'
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
import { useProductsQuery } from '@/hooks/use-inventory-query'
import { useTableSorting } from '@/hooks/use-table-sorting'
import { useAuth } from '@/hooks/use-auth'
import { formatProductMassKgFromGrams } from '@/lib/format-product-mass'
import { cn } from '@/lib/utils'
import type { Product, ProductsListParams } from '@/types/inventory'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from '@/constants/table-pagination'

const PAGE_SIZES = TABLE_PAGE_SIZES

export function ProductsTable() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canManage = user?.role !== 'SALES_STAFF' && user?.role !== 'FINANCE_STAFF'
  const [params, setParams] = useState<ProductsListParams>({
    page: 1,
    page_size: DEFAULT_TABLE_PAGE_SIZE,
    ordering: 'name',
  })
  const [searchInput, setSearchInput] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const { data, isLoading, isError, error, isFetching } = useProductsQuery(params)

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

  const onOrderingChange = useCallback(
    (ordering: string) => setParams((p) => ({ ...p, page: 1, ordering })),
    []
  )

  const { sortHeader } = useTableSorting({
    ordering: params.ordering,
    defaultOrdering: 'name',
    onOrderingChange,
  })

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        accessorKey: 'variant_name',
        header: () => sortHeader('Varian', 'variant_name'),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.variant_name}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: () => sortHeader('Nama produk', 'name'),
        cell: ({ row }) => row.original.name,
      },
      {
        accessorKey: 'remaining_mass_grams',
        header: () => sortHeader('Stok utama', 'remaining_mass_grams'),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatProductMassKgFromGrams(row.original.remaining_mass_grams)} kg
          </span>
        ),
      },
      {
        accessorKey: 'is_active',
        header: () => sortHeader('Status', 'is_active'),
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge variant="default">Aktif</Badge>
          ) : (
            <Badge variant="secondary">Nonaktif</Badge>
          ),
      },
      {
        id: 'updated',
        header: () => sortHeader('Diubah', 'updated_at', { preferDesc: true }),
        cell: ({ row }) => (
          <span className="text-on-surface-variant text-sm tabular-nums">
            {new Date(row.original.updated_at).toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex justify-end gap-1">
              {canManage ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="size-8 px-0"
                    onClick={() => navigate(`/admin/inventaris/${p.id}/edit`)}
                    aria-label={`Edit ${p.variant_name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive size-8 px-0"
                    onClick={() => setDeleteTarget(p)}
                    aria-label={`Hapus ${p.variant_name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              ) : null}
            </div>
          )
        },
      },
    ],
    [canManage, navigate, sortHeader]
  )

  /* eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table */
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  return (
    <div className="space-y-4">
      {canManage ? (
        <ProductDeleteModal
          open={!!deleteTarget}
          onOpenChange={(o) => {
            if (!o) setDeleteTarget(null)
          }}
          product={deleteTarget}
        />
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="relative max-w-md flex-1">
            <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Cari varian atau nama produk…"
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
        {canManage ? (
          <Button
            type="button"
            onClick={() => navigate('/admin/inventaris/baru')}
            className="shrink-0 gap-2"
          >
            <Plus className="size-4" />
            Tambah produk
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={
            params.is_active === undefined ? 'all' : params.is_active ? 'true' : 'false'
          }
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
                    Belum ada produk. Tambahkan produk atau ubah filter.
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
