import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Eye, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DateRangePickerInput } from '@/components/ui/date-range-picker-input'
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
import { PACKAGING_TYPE_LABEL } from '@/constants/packaging-types'
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from '@/constants/table-pagination'
import { useProductPackagingListQuery } from '@/hooks/use-inventory-query'
import { useSalesOrdersQuery } from '@/hooks/use-purchase-query'
import { useTableSorting } from '@/hooks/use-table-sorting'
import {
  aggregatePackingFromOrders,
  formatKgId,
  formatOneKemasanMass,
  orderTotalMassKg,
  productDisplayName,
} from '@/lib/format-packaging-mass'
import { formatDecimalId } from '@/lib/format-number-id'
import { createOrderingChangeHandler } from '@/lib/table-sorting'
import { cn } from '@/lib/utils'
import type { OrderStatus, SalesOrder, SalesOrdersListParams } from '@/types/purchase'

const PAGE_SIZES = TABLE_PAGE_SIZES

function fmtShort(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { dateStyle: 'medium' })
}

function packagingTypeLabel(type: string | undefined) {
  if (!type) return null
  return PACKAGING_TYPE_LABEL[type as keyof typeof PACKAGING_TYPE_LABEL] ?? type
}

export function WarehouseSalesPackingTable() {
  const navigate = useNavigate()
  const [params, setParams] = useState<SalesOrdersListParams>({
    page: 1,
    page_size: DEFAULT_TABLE_PAGE_SIZE,
    ordering: '-created_at',
  })
  const [searchInput, setSearchInput] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading, isError, error, isFetching } = useSalesOrdersQuery(params)
  const catalog = useProductPackagingListQuery({
    page: 1,
    page_size: 100,
    is_active: true,
    ordering: 'net_mass_kg',
  })

  const rows = data?.results ?? []
  const total = data?.count ?? 0
  const pageSize = params.page_size ?? DEFAULT_TABLE_PAGE_SIZE
  const page = params.page ?? 1
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const packingTotals = useMemo(
    () => aggregatePackingFromOrders(data?.results ?? []),
    [data]
  )
  const catalogRows = catalog.data?.results ?? []

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
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'created_at',
        header: () => sortHeader('Tanggal', 'created_at', { preferDesc: true }),
        cell: ({ row }) => (
          <span className="text-on-surface-variant text-sm whitespace-nowrap">
            {fmtShort(row.original.created_at)}
          </span>
        ),
      },
      {
        id: 'packing',
        header: 'Produk & kemasan',
        cell: ({ row }) => {
          const lines = row.original.lines ?? []
          if (lines.length === 0) {
            return <span className="text-on-surface-variant text-sm">—</span>
          }
          return (
            <ul className="space-y-1.5">
              {lines.map((line) => (
                <li key={line.id} className="min-w-[12rem]">
                  <p className="text-on-surface text-sm font-medium">{productDisplayName(line)}</p>
                  <p className="text-on-surface-variant text-xs leading-relaxed">
                    {packagingTypeLabel(line.packaging_type)
                      ? `${packagingTypeLabel(line.packaging_type)} · `
                      : ''}
                    {line.packaging_label}
                    <span className="block">{formatOneKemasanMass(line.net_mass_kg)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )
        },
      },
      {
        id: 'total_kg',
        header: () => <span className="block text-right">Total berat</span>,
        cell: ({ row }) => (
          <span className="block text-right text-sm font-semibold tabular-nums">
            {formatKgId(orderTotalMassKg(row.original))}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Aksi</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-8 px-0"
              onClick={() => navigate(`/admin/pesanan/penjualan/${row.original.id}`)}
              title="Lihat packing"
              aria-label={`Packing ${row.original.order_code}`}
            >
              <Eye className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [navigate, sortHeader]
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
    <div className="space-y-6">
      <section className="border-outline-variant bg-surface-container-lowest ambient-shadow overflow-x-auto rounded-xl border">
        <div className="border-outline-variant border-b px-4 py-3 md:px-5">
          <h2 className="text-on-surface font-heading text-base font-semibold">Jenis kemasan</h2>
          <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">
            Acuan packing: 1 ons = 0,1 kg. Total order di bawah sudah dihitung dalam kg.
          </p>
        </div>
        {catalog.isError ? (
          <p className="text-destructive p-4 text-sm">Gagal memuat jenis kemasan.</p>
        ) : catalog.isPending ? (
          <p className="text-on-surface-variant p-4 text-sm">Memuat kemasan…</p>
        ) : catalogRows.length === 0 ? (
          <p className="text-on-surface-variant p-4 text-sm">Belum ada kemasan aktif.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-outline-variant hover:bg-transparent">
                <TableHead>Produk</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Kemasan</TableHead>
                <TableHead className="text-right">1 kemasan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogRows.map((pkg) => (
                <TableRow key={pkg.id} className="border-outline-variant">
                  <TableCell className="font-medium">
                    {pkg.product_name && pkg.product_variant_name !== pkg.product_name
                      ? `${pkg.product_name} ${pkg.product_variant_name}`
                      : pkg.product_variant_name || pkg.product_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{PACKAGING_TYPE_LABEL[pkg.packaging_type]}</Badge>
                  </TableCell>
                  <TableCell>{pkg.label}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {formatOneKemasanMass(pkg.net_mass_kg)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {packingTotals.length > 0 ? (
        <section className="border-outline-variant bg-surface-container-lowest ambient-shadow overflow-x-auto rounded-xl border">
          <div className="border-outline-variant border-b px-4 py-3 md:px-5">
            <h2 className="text-on-surface font-heading text-base font-semibold">
              Total packing di halaman ini
            </h2>
            <p className="text-on-surface-variant mt-1 text-sm leading-relaxed">
              Gabungan berat per jenis produk & kemasan (order dibatalkan tidak dihitung).
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-outline-variant hover:bg-transparent">
                <TableHead>Produk</TableHead>
                <TableHead>Kemasan</TableHead>
                <TableHead>1 kemasan</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packingTotals.map((row) => (
                <TableRow key={row.key} className="border-outline-variant">
                  <TableCell className="font-medium">{row.productName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {row.packagingType ? (
                        <Badge variant="secondary" className="w-fit">
                          {PACKAGING_TYPE_LABEL[row.packagingType]}
                        </Badge>
                      ) : null}
                      <span>{row.packagingLabel}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {formatOneKemasanMass(row.unitKg)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatKgId(row.totalKg)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative max-w-md flex-1">
          <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Cari kode order…"
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

      <p className="text-on-surface-variant text-xs leading-relaxed">
        Jumlah kemasan tidak ditampilkan sebagai qty; yang dipakai packing adalah total kg (qty ×
        berat bersih). Contoh: 10 kemasan 1 ons = {formatDecimalId(1)} kg.
      </p>
    </div>
  )
}
