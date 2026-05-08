import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

import {
  createPayrollPeriod,
  deletePayrollPeriod,
  fetchPayrollPeriods,
} from '@/api/payroll'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { alert } from '@/lib/alert'
import type { PayrollPeriod } from '@/types/payroll'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

function monthLabel(m: number) {
  try {
    return new Date(2024, m - 1).toLocaleString('id-ID', { month: 'long' })
  } catch {
    return String(m)
  }
}

export function AdminPayrollPeriodsPage() {
  const [rows, setRows] = useState<PayrollPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [yearStr, setYearStr] = useState(String(new Date().getFullYear()))
  const [monthStr, setMonthStr] = useState(String(new Date().getMonth() + 1))
  const [notes, setNotes] = useState('')

  async function reload() {
    setLoading(true)
    try {
      const list = await fetchPayrollPeriods()
      setRows(list)
    } catch (e) {
      alert.error('Payroll', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function handleCreate() {
    const y = Number(yearStr)
    const m = Number(monthStr)
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      alert.error('Validasi', 'Tahun dan bulan harus valid (bulan 1–12).')
      return
    }
    setCreating(true)
    try {
      await createPayrollPeriod({ year: y, month: m, notes: notes.trim() || undefined })
      setNotes('')
      alert.success('Periode', 'Periode draft dibuat.')
      await reload()
    } catch (e) {
      alert.error('Gagal membuat periode', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: number) {
    const ok =
      typeof window !== 'undefined' ? window.confirm('Hapus periode draft ini?') : false
    if (!ok) return
    try {
      await deletePayrollPeriod(id)
      alert.success('Dihapus', 'Periode draft dihapus.')
      await reload()
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Payroll dan slip gaji
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Kelola periode gaji bulanan: buat draft, bangkitkan entri dari presensi dan gaji pokok pegawai aktif,
          sesuaikan potongan di periode draft, lalu kunci oleh admin/pemilik ketika slip siap dibagikan.
        </p>
        <p className="mt-3 text-sm">
          <Link to="/admin/gaji/kompensasi" className="text-primary font-semibold underline">
            Gaji pokok pegawai (ringkasan untuk keuangan/pemilik)
          </Link>
        </p>
      </div>

      <section className="border-outline-variant space-y-4 rounded-xl border p-6">
        <h2 className="text-on-surface text-sm font-semibold tracking-wide uppercase">
          Periode baru (draft)
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="py-y">Tahun</Label>
            <Input
              id="py-y"
              inputMode="numeric"
              value={yearStr}
              onChange={(e) => setYearStr(e.target.value.replace(/\D/g, '').slice(0, 5))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="py-m">Bulan</Label>
            <Input
              id="py-m"
              inputMode="numeric"
              min={1}
              max={12}
              value={monthStr}
              onChange={(e) => setMonthStr(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="py-notes">Catatan (opsional)</Label>
          <textarea
            id="py-notes"
            value={notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            rows={2}
            className={cn(
              'border-input bg-background placeholder:text-muted-foreground min-h-[4.5rem] w-full rounded-lg border px-3 py-2 text-sm outline-none transition-[color,box-shadow]',
              'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
            )}
          />
        </div>
        <Button type="button" disabled={creating} onClick={() => void handleCreate()}>
          {creating ? 'Membuat…' : 'Buat periode draft'}
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-on-surface text-sm font-semibold tracking-wide uppercase">
          Daftar periode
        </h2>
        {loading ? (
          <p className="text-on-surface-variant text-sm">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm">Belum ada periode.</p>
        ) : (
          <div className="border-outline-variant overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        to={`/admin/gaji/${p.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {monthLabel(p.month)} {p.year}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.status === 'FINALIZED' ? 'default' : 'secondary'}>
                        {p.status === 'FINALIZED' ? 'Dikunci' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <Link to={`/admin/gaji/${p.id}`}>Detail</Link>
                      </Button>
                      {p.status === 'DRAFT' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                          onClick={() => void handleDelete(p.id)}
                        >
                          Hapus
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
