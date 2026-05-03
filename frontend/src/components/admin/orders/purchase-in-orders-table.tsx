import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Eye, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
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
import { ORDER_STATUS_LABEL } from '@/constants/order-status'
import { usePurchaseInOrdersQuery } from '@/hooks/use-purchase-query'
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import type { OrderStatus, PurchaseInOrder, PurchaseInOrdersListParams } from '@/types/purchase'

const PAGE_SIZES = [10, 20, 50] as const

const ORDERING_DEFAULT = '__default__' as const

const ORDERING: { value: string; label: string }[] = [
  { value: ORDERING_DEFAULT, label: 'Default (terbaru)' },
  { value: '-created_at', label: 'Terbaru' },
  { value: 'created_at', label: 'Terlama' },
  { value: '-total_idr', label: 'Total tertinggi' },
  { value: 'order_code', label: 'Kode A–Z' },
]

function fmtShort(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { dateStyle: 'medium' })
}

export function PurchaseInOrdersTable() {
  const navigate = useNavigate()
  const [params, setParams] = useState<PurchaseInOrdersListParams>({
    page: 1,
    page_size: 20,
  })
  const [searchInput, setSearchInput] = useState('')

  const { data, isLoading, isError, error, isFetching } = usePurchaseInOrdersQuery(params)

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

  const columns = useMemo<ColumnDef<PurchaseInOrder>[]>(
    () => [
      {
        accessorKey: 'order_code',
        header: 'Kode',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.order_code}</span>
        ),
      },
      {
        accessorKey: 'supplier_name',
        header: 'Supplier',
        cell: ({ row }) => row.original.supplier_name,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'total_idr',
        header: 'Total',
        cell: ({ row }) => (
          <span className="tabular-nums">{formatIdr(row.original.total_idr)}</span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Tanggal',
        cell: ({ row }) => (
          <span className="text-on-surface-variant text-sm whitespace-nowrap">
            {fmtShort(row.original.created_at)}
          </span>
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
              onClick={() => navigate(`/admin/pesanan/pembelian/${row.original.id}`)}
              aria-label={`Detail ${row.original.order_code}`}
            >
              <Eye className="size-4" />
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

  const statusFilter = params.status ?? 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="relative max-w-md flex-1">
            <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Cari kode, supplier, faktur…"
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
          onClick={() => navigate('/admin/pesanan/pembelian/baru')}
          className="shrink-0 gap-2"
        >
          <Plus className="size-4" />
          Order pembelian
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setParams((p) => ({
              ...p,
              page: 1,
              status: v === 'all' ? undefined : (v as OrderStatus),
            }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,14rem)]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </SelectItem>
            ))}
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
                    Belum ada order pembelian bahan.
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
