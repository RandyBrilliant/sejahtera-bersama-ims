import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, Plus, Search, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/date-picker-input'
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
import {
  useCancelPurchaseInOrderMutation,
  usePurchaseInOrdersQuery,
  useVerifyPurchaseInOrderMutation,
} from '@/hooks/use-purchase-query'
import { useAuth } from '@/hooks/use-auth'
import { alert } from '@/lib/alert'
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
  const { user } = useAuth()
  const canManagePurchase = user?.role === 'ADMIN' || user?.role === 'LEADERSHIP' || user?.role === 'WAREHOUSE_STAFF'
  const [params, setParams] = useState<PurchaseInOrdersListParams>({
    page: 1,
    page_size: 20,
  })
  const [searchInput, setSearchInput] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<{
    action: 'verify' | 'cancel'
    order: PurchaseInOrder
  } | null>(null)

  const { data, isLoading, isError, error, isFetching } = usePurchaseInOrdersQuery(params)
  const verifyMut = useVerifyPurchaseInOrderMutation(confirmTarget?.order.id ?? 0)
  const cancelMut = useCancelPurchaseInOrderMutation(confirmTarget?.order.id ?? 0)

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

  async function submitQuickAction() {
    if (!confirmTarget) return
    try {
      if (confirmTarget.action === 'verify') {
        await verifyMut.mutateAsync()
        alert.success('Berhasil', `Order ${confirmTarget.order.order_code} ditandai sukses.`)
      } else {
        await cancelMut.mutateAsync()
        alert.success('Berhasil', `Order ${confirmTarget.order.order_code} dibatalkan.`)
      }
      setConfirmTarget(null)
    } catch (err) {
      alert.error('Gagal memproses aksi', parsePurchaseMutationError(err))
    }
  }

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
        header: 'Aksi cepat',
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-1.5">
            {row.original.payment_proof ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
              >
                <a href={row.original.payment_proof} target="_blank" rel="noopener noreferrer">
                  Lihat bukti
                </a>
              </Button>
            ) : null}
            {canManagePurchase &&
            (row.original.status === 'PAYMENT_PROOF_UPLOADED' ||
              (row.original.status === 'AWAITING_PAYMENT' && !!row.original.payment_proof)) ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => setConfirmTarget({ action: 'verify', order: row.original })}
              >
                <CheckCircle2 className="size-4" />
                Sukses
              </Button>
            ) : null}
            {canManagePurchase && row.original.status !== 'VERIFIED' && row.original.status !== 'CANCELLED' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setConfirmTarget({ action: 'cancel', order: row.original })}
              >
                <XCircle className="mr-1 size-4" />
                Batalkan
              </Button>
            ) : null}
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
    [canManagePurchase, navigate]
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
              placeholder="Cari kode, faktur, catatan…"
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
        {canManagePurchase ? (
          <Button
            type="button"
            onClick={() => navigate('/admin/pesanan/pembelian/baru')}
            className="shrink-0 gap-2"
          >
            <Plus className="size-4" />
            Order pembelian
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DatePickerInput
          value={startDate}
          onChange={(v) => {
            setStartDate(v)
            setParams((p) => ({ ...p, page: 1, start_date: v || undefined }))
          }}
          className="w-[150px]"
          ariaLabel="Dari tanggal"
          maxDate={endDate || undefined}
          placeholder="Dari tanggal"
        />
        <span className="text-on-surface-variant text-sm">s/d</span>
        <DatePickerInput
          value={endDate}
          onChange={(v) => {
            setEndDate(v)
            setParams((p) => ({ ...p, page: 1, end_date: v || undefined }))
          }}
          className="w-[150px]"
          ariaLabel="Sampai tanggal"
          minDate={startDate || undefined}
          placeholder="Sampai tanggal"
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

      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.action === 'verify' ? 'Konfirmasi tandai sukses' : 'Konfirmasi pembatalan'}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.action === 'verify'
                ? `Order ${confirmTarget.order.order_code} akan diubah ke status "Pembayaran diterima".`
                : `Order ${confirmTarget?.order.order_code} akan diubah ke status "Dibatalkan".`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmTarget(null)}
              disabled={verifyMut.isPending || cancelMut.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void submitQuickAction()}
              disabled={verifyMut.isPending || cancelMut.isPending}
            >
              {verifyMut.isPending || cancelMut.isPending ? 'Memproses…' : 'Ya, lanjutkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
