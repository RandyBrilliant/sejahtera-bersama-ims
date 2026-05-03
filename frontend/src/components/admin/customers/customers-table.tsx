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
import { useCustomersQuery } from '@/hooks/use-purchase-query'
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

const PAGE_SIZES = [10, 20, 50] as const

const ORDERING_OPTIONS: { value: string; label: string }[] = [
  { value: 'name', label: 'Nama A–Z' },
  { value: '-name', label: 'Nama Z–A' },
  { value: '-created_at', label: 'Terbaru dibuat' },
  { value: 'created_at', label: 'Terlama dibuat' },
]

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
  const [params, setParams] = useState<CustomersListParams>({
    page: 1,
    page_size: 20,
    ordering: 'name',
  })
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const listParams = useMemo(
    () => ({
      ...params,
      is_active: statusFromFilter(statusFilter),
    }),
    [params, statusFilter]
  )

  const { data, isLoading, isError, error, isFetching } = useCustomersQuery(listParams)

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

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Nama',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'company_name',
        header: 'Perusahaan',
        cell: ({ row }) => row.original.company_name || '—',
      },
      {
        accessorKey: 'phone',
        header: 'Telepon',
        cell: ({ row }) => row.original.phone || '—',
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email || '—',
      },
      {
        id: 'status',
        header: 'Status',
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
          </div>
        ),
      },
    ],
    [navigate]
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
              placeholder="Cari nama, perusahaan, telepon…"
              className="border-outline-variant pl-10"
            />
          </div>
          <Button type="button" variant="outline" onClick={runSearch} className="shrink-0">
            Cari
          </Button>
        </div>
        <Button
          type="button"
          className="ambient-shadow shrink-0 gap-2"
          onClick={() => navigate('/admin/pelanggan/baru')}
        >
          <Plus className="size-4" />
          Pelanggan baru
        </Button>
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
          value={params.ordering ?? 'name'}
          onValueChange={(ordering) =>
            setParams((p) => ({ ...p, page: 1, ordering }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[200px]">
            <SelectValue placeholder="Urutan" />
          </SelectTrigger>
          <SelectContent>
            {ORDERING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFetching ? (
          <span className="text-on-surface-variant text-xs">Memperbarui…</span>
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

      <CustomerDeleteModal
        open={deleteTarget != null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        customer={deleteTarget}
      />
    </div>
  )
}
