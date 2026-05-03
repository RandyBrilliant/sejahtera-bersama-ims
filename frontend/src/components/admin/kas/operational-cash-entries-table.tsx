import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ENTRY_KIND_LABEL } from '@/constants/expenses'
import { OperationalCashEntryDeleteModal } from '@/components/admin/kas/operational-cash-entry-delete-modal'
import { useOperationalCashEntriesQuery } from '@/hooks/use-expenses-query'
import { formatIdr } from '@/lib/format-idr'
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
import type {
  EntryKind,
  OperationalCashEntry,
  OperationalCashEntryListParams,
} from '@/types/expenses'

const PAGE_SIZES = [10, 20, 50] as const

const ORDERING_OPTIONS: { value: string; label: string }[] = [
  { value: '-occurred_on,-id', label: 'Tanggal terbaru' },
  { value: 'occurred_on,id', label: 'Tanggal terlama' },
  { value: '-amount_idr', label: 'Jumlah tertinggi' },
  { value: 'amount_idr', label: 'Jumlah terendah' },
]

const DIR_FILTER: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua arah' },
  { value: 'INCOME', label: ENTRY_KIND_LABEL.INCOME },
  { value: 'EXPENSE', label: ENTRY_KIND_LABEL.EXPENSE },
]

function truncate(s: string, n: number) {
  if (s.length <= n) return s
  return `${s.slice(0, n)}…`
}

export function OperationalCashEntriesTable() {
  const navigate = useNavigate()
  const [params, setParams] = useState<OperationalCashEntryListParams>({
    page: 1,
    page_size: 20,
    ordering: '-occurred_on,-id',
  })
  const [searchInput, setSearchInput] = useState('')
  const [dirFilter, setDirFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<OperationalCashEntry | null>(null)

  const listParams = useMemo(() => {
    const p: OperationalCashEntryListParams = { ...params }
    if (dirFilter !== 'all') {
      p.direction = dirFilter as EntryKind
    } else {
      delete p.direction
    }
    if (fromDate.trim()) p.occurred_on_from = fromDate.trim()
    else delete p.occurred_on_from
    if (toDate.trim()) p.occurred_on_to = toDate.trim()
    else delete p.occurred_on_to
    return p
  }, [params, dirFilter, fromDate, toDate])

  const { data, isLoading, isError, error, isFetching } =
    useOperationalCashEntriesQuery(listParams)

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

  const columns = useMemo<ColumnDef<OperationalCashEntry>[]>(
    () => [
      {
        accessorKey: 'occurred_on',
        header: 'Tanggal',
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.occurred_on}</span>
        ),
      },
      {
        accessorKey: 'direction',
        header: 'Jenis',
        cell: ({ row }) => (
          <Badge variant="outline">{ENTRY_KIND_LABEL[row.original.direction]}</Badge>
        ),
      },
      {
        accessorKey: 'category_name',
        header: 'Kategori',
        cell: ({ row }) => row.original.category_name,
      },
      {
        accessorKey: 'amount_idr',
        header: 'Jumlah',
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatIdr(row.original.amount_idr)}
          </span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Deskripsi',
        cell: ({ row }) => (
          <span className="max-w-[220px]">{truncate(row.original.description, 80)}</span>
        ),
      },
      {
        id: 'link',
        header: 'Tautan',
        cell: ({ row }) => {
          const r = row.original
          if (r.sales_order_code)
            return <span className="text-xs tabular-nums">SO {r.sales_order_code}</span>
          if (r.purchase_in_order_code)
            return <span className="text-xs tabular-nums">PI {r.purchase_in_order_code}</span>
          return '—'
        },
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
              aria-label="Edit transaksi"
              onClick={() => navigate(`/admin/kas/entri/${row.original.id}/edit`)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive size-8 px-0"
              aria-label="Hapus transaksi"
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
              placeholder="Cari deskripsi, referensi, kode order…"
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
          onClick={() => navigate('/admin/kas/entri/baru')}
        >
          <Plus className="size-4" />
          Transaksi baru
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={dirFilter}
          onValueChange={(v) => {
            setDirFilter(v)
            setParams((p) => ({ ...p, page: 1 }))
          }}
        >
          <SelectTrigger className="border-outline-variant w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIR_FILTER.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value)
              setParams((p) => ({ ...p, page: 1 }))
            }}
            className="border-outline-variant w-[150px]"
            aria-label="Dari tanggal"
          />
          <span className="text-on-surface-variant text-sm">s/d</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value)
              setParams((p) => ({ ...p, page: 1 }))
            }}
            className="border-outline-variant w-[150px]"
            aria-label="Sampai tanggal"
          />
        </div>
        <Select
          value={params.ordering ?? '-occurred_on,-id'}
          onValueChange={(ordering) => setParams((p) => ({ ...p, page: 1, ordering }))}
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
          {(error as Error)?.message ?? 'Gagal memuat transaksi.'}
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
                  Belum ada transaksi pada filter ini.
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
          {total.toLocaleString('id-ID')} baris
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

      <OperationalCashEntryDeleteModal
        open={deleteTarget != null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        entry={deleteTarget}
      />
    </div>
  )
}
