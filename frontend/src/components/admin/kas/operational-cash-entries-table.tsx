import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ENTRY_KIND_LABEL, PAYMENT_METHOD_LABEL } from '@/constants/expenses'
import { OperationalCashEntryDeleteModal } from '@/components/admin/kas/operational-cash-entry-delete-modal'
import {
  useOperationalCashEntriesQuery,
  useOperationalCategoriesQuery,
} from '@/hooks/use-expenses-query'
import { useTableSorting } from '@/hooks/use-table-sorting'
import { createOrderingChangeHandler } from '@/lib/table-sorting'
import { formatIdr } from '@/lib/format-idr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DateRangePickerInput } from '@/components/ui/date-range-picker-input'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  OperationalCategory,
  PaymentMethod,
} from '@/types/expenses'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from '@/constants/table-pagination'

const PAGE_SIZES = TABLE_PAGE_SIZES

const DIR_FILTER: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua arah' },
  { value: 'INCOME', label: ENTRY_KIND_LABEL.INCOME },
  { value: 'EXPENSE', label: ENTRY_KIND_LABEL.EXPENSE },
]

const PAYMENT_FILTER: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua metode' },
  { value: 'CASH', label: PAYMENT_METHOD_LABEL.CASH },
  { value: 'TRANSFER', label: PAYMENT_METHOD_LABEL.TRANSFER },
]

function truncate(s: string, n: number) {
  if (s.length <= n) return s
  return `${s.slice(0, n)}…`
}

function categoryOptionLabel(c: OperationalCategory) {
  return c.is_active ? c.name : `${c.name} (nonaktif)`
}

export function OperationalCashEntriesTable() {
  const navigate = useNavigate()
  const [params, setParams] = useState<OperationalCashEntryListParams>({
    page: 1,
    page_size: DEFAULT_TABLE_PAGE_SIZE,
    ordering: '-occurred_on,-id',
  })
  const [searchInput, setSearchInput] = useState('')
  const [dirFilter, setDirFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<OperationalCashEntry | null>(null)

  const categoriesQuery = useOperationalCategoriesQuery({
    page_size: 100,
    ordering: 'entry_kind,sort_order,name',
  })
  const categories = categoriesQuery.data?.results ?? []
  const visibleCategories = useMemo(() => {
    if (dirFilter === 'all') return categories
    return categories.filter((c) => c.entry_kind === dirFilter)
  }, [categories, dirFilter])
  const incomeCategories = useMemo(
    () => visibleCategories.filter((c) => c.entry_kind === 'INCOME'),
    [visibleCategories]
  )
  const expenseCategories = useMemo(
    () => visibleCategories.filter((c) => c.entry_kind === 'EXPENSE'),
    [visibleCategories]
  )

  const listParams = useMemo(() => {
    const p: OperationalCashEntryListParams = { ...params }
    if (dirFilter !== 'all') {
      p.direction = dirFilter as EntryKind
    } else {
      delete p.direction
    }
    if (categoryFilter !== 'all') {
      const id = Number(categoryFilter)
      if (Number.isFinite(id) && id > 0) p.category = id
      else delete p.category
    } else {
      delete p.category
    }
    if (paymentFilter !== 'all') {
      p.payment_method = paymentFilter as PaymentMethod
    } else {
      delete p.payment_method
    }
    if (fromDate.trim()) p.occurred_on_from = fromDate.trim()
    else delete p.occurred_on_from
    if (toDate.trim()) p.occurred_on_to = toDate.trim()
    else delete p.occurred_on_to
    return p
  }, [params, dirFilter, categoryFilter, paymentFilter, fromDate, toDate])

  const { data, isLoading, isError, error, isFetching } =
    useOperationalCashEntriesQuery(listParams)

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
    defaultOrdering: '-occurred_on,-id',
    onOrderingChange,
  })

  const columns = useMemo<ColumnDef<OperationalCashEntry>[]>(
    () => [
      {
        accessorKey: 'occurred_on',
        header: () =>
          sortHeader('Tanggal', {
            field: 'occurred_on',
            asc: 'occurred_on,id',
            desc: '-occurred_on,-id',
          }, { preferDesc: true }),
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
        accessorKey: 'payment_method',
        header: 'Metode',
        cell: ({ row }) => (
          <Badge variant="secondary">{PAYMENT_METHOD_LABEL[row.original.payment_method]}</Badge>
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
        accessorKey: 'reference',
        header: 'Referensi',
        cell: ({ row }) => {
          const ref = row.original.reference?.trim()
          const so = row.original.sales_order_code?.trim()
          if (!ref && !so) {
            return <span className="text-on-surface-variant">—</span>
          }
          return (
            <span className="text-on-surface-variant max-w-[180px] font-mono text-xs">
              {ref ? truncate(ref, 40) : null}
              {ref && so ? ' · ' : null}
              {so ? so : null}
            </span>
          )
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
    [navigate, sortHeader]
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
              autoComplete="off"
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
            setCategoryFilter((prev) => {
              if (prev === 'all' || v === 'all') return prev
              const cat = categories.find((c) => String(c.id) === prev)
              if (!cat || cat.entry_kind !== v) return 'all'
              return prev
            })
            setParams((p) => ({ ...p, page: 1 }))
          }}
        >
          <SelectTrigger className="border-outline-variant w-[160px]" aria-label="Filter jenis">
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
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v)
            setParams((p) => ({ ...p, page: 1 }))
          }}
        >
          <SelectTrigger className="border-outline-variant w-[220px]" aria-label="Filter kategori">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {dirFilter === 'all' ? (
              <>
                {incomeCategories.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>{ENTRY_KIND_LABEL.INCOME}</SelectLabel>
                    {incomeCategories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {categoryOptionLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                {expenseCategories.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>{ENTRY_KIND_LABEL.EXPENSE}</SelectLabel>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {categoryOptionLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
              </>
            ) : (
              visibleCategories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {categoryOptionLabel(c)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Select
          value={paymentFilter}
          onValueChange={(v) => {
            setPaymentFilter(v)
            setParams((p) => ({ ...p, page: 1 }))
          }}
        >
          <SelectTrigger className="border-outline-variant w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_FILTER.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePickerInput
            className="w-[min(100%,280px)]"
            startDate={fromDate}
            endDate={toDate}
            onChange={({ start, end }) => {
              setFromDate(start)
              setToDate(end)
              setParams((p) => ({ ...p, page: 1 }))
            }}
            placeholder="Filter tanggal…"
            ariaLabel="Filter rentang tanggal"
          />
        </div>
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
