import { useCallback, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserX,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { USER_ROLE_LABEL, USER_ROLE_PILL_CLASS } from '@/constants/user-roles'
import { useSystemUsersQuery } from '@/hooks/use-system-users-query'
import { formatRegionalPhonePreview } from '@/lib/regional-phone'
import { cn } from '@/lib/utils'
import { StaffUserStatusModal } from '@/components/admin/staff/staff-user-status-modal'
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
import type { UserRole } from '@/types/auth'
import type { SystemUser, UsersListParams } from '@/types/system-user'

const PAGE_SIZES = [10, 20, 50] as const

const ORDERING_OPTIONS: { value: string; label: string }[] = [
  { value: 'username', label: 'Username A–Z' },
  { value: '-username', label: 'Username Z–A' },
  { value: '-created_at', label: 'Terbaru dibuat' },
  { value: 'created_at', label: 'Terlama dibuat' },
]

const ROLE_FILTER: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua peran' },
  { value: 'ADMIN', label: USER_ROLE_LABEL.ADMIN },
  { value: 'LEADERSHIP', label: USER_ROLE_LABEL.LEADERSHIP },
  { value: 'WAREHOUSE_STAFF', label: USER_ROLE_LABEL.WAREHOUSE_STAFF },
  { value: 'SALES_STAFF', label: USER_ROLE_LABEL.SALES_STAFF },
  { value: 'FINANCE_STAFF', label: USER_ROLE_LABEL.FINANCE_STAFF },
]

type StatusIntent = 'activate' | 'deactivate'

export function StaffUsersTable() {
  const navigate = useNavigate()

  const [params, setParams] = useState<UsersListParams>({
    page: 1,
    page_size: 20,
    ordering: 'username',
  })
  const [searchInput, setSearchInput] = useState('')
  const [statusTarget, setStatusTarget] = useState<{
    user: SystemUser
    intent: StatusIntent
  } | null>(null)

  const { data, isLoading, isError, error, isFetching } = useSystemUsersQuery(params)

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

  const openDeactivate = useCallback((u: SystemUser) => {
    setStatusTarget({ user: u, intent: 'deactivate' })
  }, [])

  const openActivate = useCallback((u: SystemUser) => {
    setStatusTarget({ user: u, intent: 'activate' })
  }, [])

  const columns = useMemo<ColumnDef<SystemUser>[]>(
    () => [
      {
        accessorKey: 'username',
        header: 'Username',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.username}</span>
        ),
      },
      {
        accessorKey: 'full_name',
        header: 'Nama',
        cell: ({ row }) => row.original.full_name || '—',
      },
      {
        accessorKey: 'role',
        header: 'Peran',
        cell: ({ row }) => {
          const role = row.original.role
          const label = USER_ROLE_LABEL[role] ?? role
          return (
            <Badge
              variant="outline"
              className={cn(
                USER_ROLE_PILL_CLASS[role],
                'font-medium shadow-none'
              )}
            >
              {label}
            </Badge>
          )
        },
      },
      {
        id: 'phone',
        header: 'Telepon',
        cell: ({ row }) => (
          <span className="text-on-surface-variant max-w-[14rem] truncate text-sm">
            {formatRegionalPhonePreview(row.original.phone_number ?? '')}
          </span>
        ),
      },
      {
        id: 'employee_code',
        header: 'Kode karyawan',
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.employee_profile?.employee_code ?? '—'}
          </span>
        ),
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
          const u = row.original
          return (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 px-0"
                onClick={() => navigate(`/admin/staf/${u.id}/edit`)}
                aria-label={`Edit ${u.username}`}
              >
                <Pencil className="size-4" />
              </Button>
              {u.is_active ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive size-8 px-0"
                  onClick={() => openDeactivate(u)}
                  aria-label={`Nonaktifkan ${u.username}`}
                >
                  <UserX className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="size-8 px-0"
                  onClick={() => openActivate(u)}
                  aria-label={`Aktifkan ${u.username}`}
                >
                  <UserCheck className="size-4" />
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [navigate, openActivate, openDeactivate]
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
      <StaffUserStatusModal
        open={!!statusTarget}
        onOpenChange={(o) => {
          if (!o) setStatusTarget(null)
        }}
        user={statusTarget?.user ?? null}
        intent={statusTarget?.intent ?? null}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
          <div className="relative max-w-md flex-1">
            <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Cari username, nama, telepon…"
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
          onClick={() => navigate('/admin/staf/baru')}
          className="shrink-0 gap-2"
        >
          <Plus className="size-4" />
          Tambah pengguna
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={params.role ? params.role : 'all'}
          onValueChange={(v) =>
            setParams((p) => ({
              ...p,
              page: 1,
              role: v === 'all' ? '' : (v as UserRole),
            }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,13rem)]">
            <SelectValue placeholder="Peran" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTER.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={
            params.is_active === undefined
              ? 'all'
              : params.is_active
                ? 'true'
                : 'false'
          }
          onValueChange={(v) =>
            setParams((p) => ({
              ...p,
              page: 1,
              is_active:
                v === 'all' ? undefined : v === 'true',
            }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,11rem)]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="true">Aktif saja</SelectItem>
            <SelectItem value="false">Nonaktif saja</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={params.ordering ?? 'username'}
          onValueChange={(ordering) =>
            setParams((p) => ({ ...p, page: 1, ordering }))
          }
        >
          <SelectTrigger className="border-outline-variant w-[min(100%,14rem)]">
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
                    Tidak ada data pengguna.
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
            Menampilkan {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} dari {total}
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
