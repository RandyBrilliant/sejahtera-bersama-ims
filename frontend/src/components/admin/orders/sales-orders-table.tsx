import { useCallback, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Paperclip,
  Plus,
  Search,
  Upload,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Button } from '@/components/ui/button'
import { DateRangePickerInput } from '@/components/ui/date-range-picker-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useAuth } from '@/hooks/use-auth'
import {
  useSalesOrdersQuery,
  useUploadSalesPaymentProofByIdMutation,
  useVerifySalesOrderByIdMutation,
} from '@/hooks/use-purchase-query'
import { useTableSorting } from '@/hooks/use-table-sorting'
import { alert } from '@/lib/alert'
import { createOrderingChangeHandler } from '@/lib/table-sorting'
import { formatIdr } from '@/lib/format-idr'
import { resolveMediaUrl } from '@/lib/media-url'
import { cn } from '@/lib/utils'
import type { OrderStatus, SalesOrder, SalesOrdersListParams } from '@/types/purchase'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from '@/constants/table-pagination'

const PAGE_SIZES = TABLE_PAGE_SIZES

function fmtShort(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { dateStyle: 'medium' })
}

/** Owner may verify once payment proof exists (mirrors the detail page rule). */
function canVerifyOrder(order: SalesOrder): boolean {
  if (order.status === 'VERIFIED' || order.status === 'CANCELLED') return false
  return (
    order.status === 'PAYMENT_PROOF_UPLOADED' ||
    (order.status === 'AWAITING_PAYMENT' && !!order.payment_proof)
  )
}

/** Staff/owner may still attach proof while the order is open. */
function canUploadProof(order: SalesOrder): boolean {
  return order.status !== 'VERIFIED' && order.status !== 'CANCELLED'
}

export function SalesOrdersTable() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isOwner = user?.role === 'LEADERSHIP'
  const isFinanceReadOnly = user?.role === 'FINANCE_STAFF'
  const canCreateSalesOrder = !isFinanceReadOnly
  const [params, setParams] = useState<SalesOrdersListParams>({
    page: 1,
    page_size: DEFAULT_TABLE_PAGE_SIZE,
    ordering: '-created_at',
  })
  const [searchInput, setSearchInput] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<number | null>(null)
  const [verifyTarget, setVerifyTarget] = useState<SalesOrder | null>(null)
  const uploadMut = useUploadSalesPaymentProofByIdMutation()
  const verifyMut = useVerifySalesOrderByIdMutation()

  const handleUploadClick = useCallback((orderId: number) => {
    uploadTargetRef.current = orderId
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      const orderId = uploadTargetRef.current
      uploadTargetRef.current = null
      if (!file || orderId == null) return
      try {
        await uploadMut.mutateAsync({ orderId, file })
        alert.success('Berhasil', 'Bukti pembayaran diunggah.')
      } catch (err) {
        alert.error('Gagal mengunggah', parsePurchaseMutationError(err))
      }
    },
    [uploadMut]
  )

  const handleConfirmVerify = useCallback(async () => {
    if (!verifyTarget) return
    try {
      await verifyMut.mutateAsync(verifyTarget.id)
      alert.success('Berhasil', 'Pembayaran diverifikasi & stok produk dikurangi.')
      setVerifyTarget(null)
    } catch (err) {
      alert.error('Gagal verifikasi', parsePurchaseMutationError(err))
    }
  }, [verifyMut, verifyTarget])

  const { data, isLoading, isError, error, isFetching } = useSalesOrdersQuery(params)

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
    defaultOrdering: '-created_at',
    onOrderingChange,
  })

  const columns = useMemo<ColumnDef<SalesOrder>[]>(
    () => [
      {
        accessorKey: 'order_code',
        header: 'Kode',
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.original.order_code}</span>
        ),
      },
      {
        accessorKey: 'customer_name',
        header: 'Pelanggan',
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{row.original.customer_name}</span>
            <span className="text-on-surface-variant truncate text-xs">
              {row.original.customer_wilayah_name ?? '—'}
            </span>
          </div>
        ),
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
        header: () => sortHeader('Tgl. transaksi', 'created_at', { preferDesc: true }),
        cell: ({ row }) => (
          <span className="text-on-surface-variant text-sm whitespace-nowrap">
            {fmtShort(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'payment_date',
        header: 'Tgl. pembayaran',
        cell: ({ row }) => (
          <span className="text-on-surface-variant text-sm whitespace-nowrap">
            {fmtShort(row.original.payment_proof_uploaded_at)}
          </span>
        ),
      },
      {
        id: 'proof',
        header: 'Bukti',
        cell: ({ row }) => {
          const url = resolveMediaUrl(row.original.payment_proof)
          return url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex items-center hover:opacity-80"
              title="Lihat bukti pembayaran"
              aria-label={`Lihat bukti pembayaran ${row.original.order_code}`}
            >
              <Paperclip className="size-4" />
            </a>
          ) : (
            <span className="text-on-surface-variant">—</span>
          )
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => {
          const order = row.original
          const showUpload = !isFinanceReadOnly && canUploadProof(order)
          const showVerify = isOwner && canVerifyOrder(order)
          return (
            <div className="flex items-center justify-end gap-1">
              {showUpload ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 px-0"
                  onClick={() => handleUploadClick(order.id)}
                  disabled={uploadMut.isPending}
                  title="Unggah bukti pembayaran"
                  aria-label={`Unggah bukti pembayaran ${order.order_code}`}
                >
                  <Upload className="size-4" />
                </Button>
              ) : null}
              {showVerify ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-primary size-8 px-0"
                  onClick={() => setVerifyTarget(order)}
                  title="Verifikasi pembayaran"
                  aria-label={`Verifikasi pembayaran ${order.order_code}`}
                >
                  <CheckCircle2 className="size-4" />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 px-0"
                onClick={() => navigate(`/admin/pesanan/penjualan/${order.id}`)}
                title="Lihat detail"
                aria-label={`Detail ${order.order_code}`}
              >
                <Eye className="size-4" />
              </Button>
            </div>
          )
        },
      },
    ],
    [navigate, sortHeader, isOwner, isFinanceReadOnly, handleUploadClick, uploadMut.isPending]
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
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="relative max-w-md flex-1">
            <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Cari kode, pelanggan, faktur…"
              value={searchInput}
              autoComplete="off"
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              className="border-outline-variant pr-3 pl-10"
            />
          </div>
          <Button type="button" variant="outline" onClick={runSearch} className="shrink-0">
            Cari
          </Button>
        </div>
        {canCreateSalesOrder ? (
          <Button
            type="button"
            onClick={() => navigate('/admin/pesanan/penjualan/baru')}
            className="shrink-0 gap-2"
          >
            <Plus className="size-4" />
            Order penjualan
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DateRangePickerInput
          className="w-[min(100%,280px)]"
          startDate={startDate}
          endDate={endDate}
          onChange={({ start, end }) => {
            setStartDate(start)
            setEndDate(end)
            setParams((p) => ({
              ...p,
              page: 1,
              start_date: start || undefined,
              end_date: end || undefined,
            }))
          }}
          placeholder="Filter tanggal…"
          ariaLabel="Filter rentang tanggal"
        />

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
                    Belum ada order penjualan.
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

      <Dialog
        open={!!verifyTarget}
        onOpenChange={(open) => {
          if (!open && !verifyMut.isPending) setVerifyTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi pembayaran</DialogTitle>
            <DialogDescription>
              Verifikasi pembayaran untuk order{' '}
              <span className="text-foreground font-medium">{verifyTarget?.order_code}</span>
              {verifyTarget?.customer_name ? ` — ${verifyTarget.customer_name}` : ''}? Stok produk
              akan dikurangi dan tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVerifyTarget(null)}
              disabled={verifyMut.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmVerify()}
              disabled={verifyMut.isPending}
            >
              {verifyMut.isPending ? 'Memproses…' : 'Verifikasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
