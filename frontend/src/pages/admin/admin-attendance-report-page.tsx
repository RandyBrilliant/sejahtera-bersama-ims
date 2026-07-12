import { useEffect, useMemo, useState } from 'react'

import { fetchAttendanceReport } from '@/api/attendance'
import { fetchUsers } from '@/api/system-users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { alert } from '@/lib/alert'
import { DEFAULT_TABLE_PAGE_SIZE } from '@/constants/table-pagination'
import type { AttendanceReportEnvelope, AttendanceReportRow } from '@/types/attendance'
import type { SystemUser } from '@/types/system-user'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  const detail = d?.detail
  return typeof detail === 'string' ? detail : undefined
}

function isoDateLocal(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
}

function ReportTable({ rows }: { rows: AttendanceReportRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-on-surface-variant border-outline-variant rounded-xl border px-4 py-8 text-center text-sm">
        Tidak ada baris dalam rentang ini.
      </p>
    )
  }
  return (
    <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tanggal</TableHead>
            <TableHead>Karyawan</TableHead>
            <TableHead>Masuk</TableHead>
            <TableHead>Terlambat</TableHead>
            <TableHead>Pulang</TableHead>
            <TableHead>Verifikator masuk</TableHead>
            <TableHead>Verifikator pulang</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap tabular-nums">{r.work_date}</TableCell>
              <TableCell>
                <div className="text-on-surface font-medium">{r.employee_name}</div>
                <div className="text-on-surface-variant font-mono text-xs">{r.employee_username}</div>
              </TableCell>
              <TableCell className="tabular-nums">{fmtDt(r.checked_in_at)}</TableCell>
              <TableCell>
                {r.is_late ? (
                  <span>
                    Ya{r.minutes_late != null ? ` (${r.minutes_late} m)` : ''}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="tabular-nums">{fmtDt(r.checked_out_at)}</TableCell>
              <TableCell className="text-sm">{r.verified_in_by}</TableCell>
              <TableCell className="text-sm">{r.verified_out_by ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function AdminAttendanceReportPage() {
  const today = useMemo(() => new Date(), [])
  const defaultTo = isoDateLocal(today)
  const defaultFromDate = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 30)
    return isoDateLocal(d)
  }, [today])

  const [dateFrom, setDateFrom] = useState(defaultFromDate)
  const [dateTo, setDateTo] = useState(defaultTo)
  const [employeeFilter, setEmployeeFilter] = useState<string>('__all')
  const [page, setPage] = useState(1)
  const [staff, setStaff] = useState<SystemUser[]>([])
  const [envelope, setEnvelope] = useState<AttendanceReportEnvelope | null>(null)
  const [loading, setLoading] = useState(false)
  const pageSize = DEFAULT_TABLE_PAGE_SIZE

  useEffect(() => {
    let cancelled = false
    async function loadStaff() {
      try {
        const res = await fetchUsers({ page: 1, page_size: 200, is_active: true, ordering: 'full_name' })
        if (!cancelled) setStaff(res.results)
      } catch {
        /* optional filter */
      }
    }
    void loadStaff()
    return () => {
      cancelled = true
    }
  }, [])

  async function runFetch(nextPage = 1) {
    setLoading(true)
    try {
      const empId =
        employeeFilter === '__all' || employeeFilter === '' ? undefined : Number(employeeFilter)
      const env = await fetchAttendanceReport({
        date_from: dateFrom,
        date_to: dateTo,
        employee_id: Number.isFinite(empId) && empId! > 0 ? empId : undefined,
        page: nextPage,
        page_size: pageSize,
      })
      setEnvelope(env)
      setPage(env.page)
    } catch (e) {
      setEnvelope(null)
      alert.error('Laporan', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void runFetch(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jalankan ketika rentang utama berubah
  }, [dateFrom, dateTo, employeeFilter])

  const totalPages = envelope ? Math.max(1, Math.ceil(envelope.count / envelope.page_size)) : 1

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Laporan presensi
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Ringkasan check-in/out per pegawai aktif dalam rentang tanggal Jakarta.
        </p>
      </div>

      <section className="border-outline-variant flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="rep-from">Dari</Label>
          <Input
            id="rep-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rep-to">Sampai</Label>
          <Input id="rep-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="min-w-[200px] space-y-1.5">
          <Label htmlFor="rep-emp">Pegawai (opsional)</Label>
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger id="rep-emp" className="w-full">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Semua</SelectItem>
              {staff.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void runFetch(1)}>
          Terapkan
        </Button>
      </section>

      {loading && !envelope ? (
        <p className="text-on-surface-variant text-sm">Memuat…</p>
      ) : envelope ? (
        <>
          <p className="text-on-surface-variant text-sm">
            Menampilkan {envelope.results.length} dari {envelope.count} baris (hal {envelope.page} /{' '}
            {totalPages}).
          </p>
          <ReportTable rows={envelope.results} />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => void runFetch(page - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page >= totalPages}
              onClick={() => void runFetch(page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}
