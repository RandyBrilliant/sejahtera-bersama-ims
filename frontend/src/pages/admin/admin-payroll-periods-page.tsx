import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

import {
  createPayrollPeriod,
  deletePayrollPeriod,
  fetchPayrollPeriods,
} from '@/api/payroll'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  formatPayrollWeekLabel,
  parseIsoDateOnly,
  toIsoDateOnly,
  upcomingPaySaturday,
} from '@/lib/payroll-week'
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

export function AdminPayrollPeriodsPage() {
  const [rows, setRows] = useState<PayrollPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [payDate, setPayDate] = useState(() => toIsoDateOnly(upcomingPaySaturday()))
  const [cutoffDate, setCutoffDate] = useState('')
  const [notes, setNotes] = useState('')

  const periodPreview = useMemo(() => {
    if (!payDate) return null
    try {
      const pay = parseIsoDateOnly(payDate)
      const end = cutoffDate ? parseIsoDateOnly(cutoffDate) : pay
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      return formatPayrollWeekLabel(payDate, toIsoDateOnly(start), toIsoDateOnly(end))
    } catch {
      return null
    }
  }, [payDate, cutoffDate])

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
    if (!payDate) {
      alert.error('Validasi', 'Pilih tanggal pembayaran.')
      return
    }
    setCreating(true)
    try {
      await createPayrollPeriod({
        pay_date: payDate,
        cutoff_date: cutoffDate.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setNotes('')
      setCutoffDate('')
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
          Periode gaji
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Buat draft periode dengan tanggal bayar fleksibel (mis. Jumat). Cutoff menentukan pekerjaan
          mana yang masuk periode ini; pekerjaan setelah cutoff otomatis menggulung ke periode
          berikutnya. Generate entri dari presensi (harian) atau hasil kupas (borongan), lalu kunci.
        </p>
      </div>

      <section className="border-outline-variant space-y-4 rounded-xl border p-6">
        <h2 className="text-on-surface text-sm font-semibold tracking-wide uppercase">
          Periode baru (draft)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">Tanggal pembayaran</Label>
            <DatePickerInput
              id="pay-date"
              value={payDate}
              onChange={setPayDate}
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cutoff-date">Cutoff (opsional)</Label>
            <DatePickerInput
              id="cutoff-date"
              value={cutoffDate}
              onChange={setCutoffDate}
              disabled={creating}
            />
            <p className="text-on-surface-variant text-xs">
              Kosongkan = cutoff sama dengan tanggal bayar. Pekerjaan setelah cutoff masuk periode
              berikutnya.
            </p>
          </div>
        </div>
        {periodPreview ? (
          <p className="text-on-surface-variant text-xs leading-relaxed">{periodPreview}</p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="py-notes">Catatan (opsional)</Label>
          <textarea
            id="py-notes"
            value={notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            rows={2}
            className={cn(
              'border-input bg-field placeholder:text-muted-foreground min-h-[4.5rem] w-full rounded-lg border px-3 py-2 text-sm outline-none transition-[color,box-shadow]',
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
          <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode / bayar</TableHead>
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
                        {formatPayrollWeekLabel(
                          p.pay_date,
                          p.period_start_date,
                          p.period_end_date
                        )}
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
