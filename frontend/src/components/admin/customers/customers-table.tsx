import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { CustomerDeleteModal } from '@/components/admin/customers/customer-delete-modal'
import { WilayahManagerModal } from '@/components/admin/customers/wilayah-manager-modal'
import { useCustomersQuery, useWilayahQuery } from '@/hooks/use-purchase-query'
import { useTableSorting } from '@/hooks/use-table-sorting'
import { createOrderingChangeHandler } from '@/lib/table-sorting'
import { useAuth } from '@/hooks/use-auth'
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
import type { Customer, CustomersListParams } from '@/types/purchase'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from '@/constants/table-pagination'

const PAGE_SIZES = TABLE_PAGE_SIZES

const STATUS_FILTER: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
]

function statusFromFilter(v: string): boolean | undefined {
  if (v === 'active') return true
  if (v === 'inactive') return false
  return undefined
}

export function CustomersTable() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canDelete = user?.role === 'ADMIN' || user?.role === 'LEADERSHIP'
  const canEditCustomers =
    user?.role === 'ADMIN' ||
    user?.role === 'LEADERSHIP' ||
    user?.role === 'SALES_STAFF'
  const [params, setParams] = useState<CustomersListParams>({
    page: 1,
    page_size: DEFAULT_TABLE_PAGE_SIZE,
    ordering: 'name',
  })
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [wilayahFilter, setWilayahFilter] = useState('__all')
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [wilayahModalOpen, setWilayahModalOpen] = useState(false)
  const wilayahQuery = useWilayahQuery({ page: 1, page_size: 200, ordering: 'name' })

  const listParams = useMemo(
    () => ({
      ...params,
      is_active: statusFromFilter(statusFilter),
      wilayah: wilayahFilter === '__all' ? undefined : Number(wilayahFilter),
    }),
    [params, statusFilter, wilayahFilter]
  )

  const { data, isLoading, isError, error, isFetching } = useCustomersQuery(listParams)

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
    defaultOrdering: 'name',
    onOrderingChange,
  })

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: 'name',
        header: () => sortHeader('Nama', 'name'),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'phone',
        header: () => sortHeader('Telepon', 'phone'),
        cell: ({ row }) => row.original.phone || '—',
      },
      {
        id: 'wilayah_name',
        header: () => sortHeader('Wilayah', 'wilayah__name'),
        cell: ({ row }) => row.original.wilayah_name || '—',
      },
      {
        accessorKey: 'address',
        header: () => sortHeader('Alamat', 'address'),
        cell: ({ row }) => row.original.address || '—',
      },
      {
        id: 'status',
        header: () => sortHeader('Status', 'is_active'),
        cell: ({ row }) =>
          row.original.is_active ? (
            <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300">
              Aktif
            </Badge>
          ) : (
            <Badge variant="secondary">Nonaktif</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {canEditCustomers ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 px-0"
                aria-label={`Edit ${row.original.name}`}
                onClick={() => navigate(`/admin/pelanggan/${row.original.id}/edit`)}
              >
                <Pencil className="size-4" />
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive size-8 px-0"
                aria-label={`Hapus ${row.original.name}`}
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canEditCustomers, navigate, sortHeader]
  )

  /* eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table row API */
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Cari nama, wilayah, telepon, alamat…"
              className="border-outline-variant pl-10"
            />
          </div>
          <Button type="button" variant="outline" onClick={runSearch} className="shrink-0">
            Cari
          </Button>
        </div>
        {canEditCustomers ? (
          <Button
            type="button"
            className="ambient-shadow shrink-0 gap-2"
            onClick={() => navigate('/admin/pelanggan/baru')}
          >
            <Plus className="size-4" />
            Pelanggan baru
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setParams((p) => ({ ...p, page: 1 }))
          }}
        >
          <SelectTrigger className="border-outline-variant w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={wilayahFilter}
          onValueChange={(v) => {
            setWilayahFilter(v)
            setParams((p) => ({ ...p, page: 1 }))
          }}
        >
          <SelectTrigger className="border-outline-variant w-[200px]">
            <SelectValue placeholder="Semua wilayah" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua wilayah</SelectItem>
            {(wilayahQuery.data?.results ?? []).map((w) => (
              <SelectItem key={w.id} value={String(w.id)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFetching ? (
          <span className="text-on-surface-variant text-xs">Memperbarui…</span>
        ) : null}
        {canEditCustomers ? (
          <Button type="button" variant="outline" onClick={() => setWilayahModalOpen(true)}>
            Kelola wilayah
          </Button>
        ) : null}
      </div>

      {isError ? (
        <p className="text-destructive text-sm">
          {(error as Error)?.message ?? 'Gagal memuat pelanggan.'}
        </p>
      ) : null}

      <div className="border-outline-variant overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="text-on-surface-variant">
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-on-surface-variant h-24">
                  Memuat…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-on-surface-variant h-24">
                  Belum ada pelanggan. Tambahkan untuk dipakai di penjualan.
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

      <div className="text-on-surface-variant flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm tabular-nums">
          {total.toLocaleString('id-ID')} pelanggan
          {total > 0
            ? ` · halaman ${page.toLocaleString('id-ID')} / ${totalPages.toLocaleString('id-ID')}`
            : ''}
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
              {PAGE_SIZES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} / hal
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-9 px-0"
              disabled={page <= 1}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="size-9 px-0"
              disabled={page >= totalPages}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {canDelete ? (
        <CustomerDeleteModal
          open={deleteTarget != null}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          customer={deleteTarget}
        />
      ) : null}
      {canEditCustomers ? (
        <WilayahManagerModal open={wilayahModalOpen} onOpenChange={setWilayahModalOpen} />
      ) : null}
    </div>
  )
}
