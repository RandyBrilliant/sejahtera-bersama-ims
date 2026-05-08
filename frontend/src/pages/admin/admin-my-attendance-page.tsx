import { useEffect, useMemo, useState } from 'react'

import { fetchMyAttendanceRows } from '@/api/attendance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { alert } from '@/lib/alert'
import type { MyAttendanceRow } from '@/types/attendance'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
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

export function AdminMyAttendancePage() {
  const today = useMemo(() => new Date(), [])
  const defaultTo = isoDateLocal(today)
  const defaultFrom = useMemo(() => {
    const d = new Date(today)
    d.setDate(d.getDate() - 90)
    return isoDateLocal(d)
  }, [today])

  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [rows, setRows] = useState<MyAttendanceRow[]>([])
  const [meta, setMeta] = useState<{ date_from: string; date_to: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const data = await fetchMyAttendanceRows({ date_from: from, date_to: to })
      setRows(data.results)
      setMeta({ date_from: data.date_from, date_to: data.date_to })
    } catch (e) {
      setRows([])
      alert.error('Presensi saya', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Presensi saya
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Riwayat check-in/out Anda menurut zona waktu Jakarta.
        </p>
      </div>

      <section className="border-outline-variant flex flex-wrap items-end gap-4 rounded-xl border p-4">
        <div className="space-y-1.5">
          <Label htmlFor="me-from">Dari</Label>
          <Input id="me-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="me-to">Sampai</Label>
          <Input id="me-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void run()}>
          Tampilkan
        </Button>
      </section>

      {meta ? (
        <p className="text-on-surface-variant text-xs">
          Referensi server: {meta.date_from} s/d {meta.date_to}
        </p>
      ) : null}

      {loading ? (
        <p className="text-on-surface-variant text-sm">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="text-on-surface-variant text-sm">Belum ada data dalam rentang ini.</p>
      ) : (
        <div className="border-outline-variant overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal kerja</TableHead>
                <TableHead>Masuk</TableHead>
                <TableHead>Telat</TableHead>
                <TableHead>Pulang</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.work_date}>
                  <TableCell className="tabular-nums">{r.work_date}</TableCell>
                  <TableCell className="tabular-nums">{fmtDt(r.checked_in_at)}</TableCell>
                  <TableCell>
                    {r.is_late ? `Ya (${r.minutes_late ?? '—'} m)` : 'Tidak'}
                  </TableCell>
                  <TableCell className="tabular-nums">{fmtDt(r.checked_out_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
