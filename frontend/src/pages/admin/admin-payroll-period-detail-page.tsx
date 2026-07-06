import type { ChangeEvent } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import {
  fetchPayrollEntries,
  fetchPayrollPeriod,
  finalizePayrollPeriod,
  generatePayrollPeriod,
  patchPayrollEntry,
  patchPayrollPeriodNotes,
} from '@/api/payroll'
import { Badge } from '@/components/ui/badge'
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
import { useAuth } from '@/hooks/use-auth'
import { alert } from '@/lib/alert'
import { formatIdr } from '@/lib/format-idr'
import { formatPayrollWeekLabel } from '@/lib/payroll-week'
import { cn } from '@/lib/utils'
import { PageBackLink } from '@/components/navigation/page-back-link'
import type { PayrollEntryRow, PayrollPeriod } from '@/types/payroll'
import { isAxiosError } from 'axios'

const LIST_PATH = '/admin/gaji'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

export function AdminPayrollPeriodDetailPage() {
  const { periodId } = useParams<{ periodId: string }>()
  const { user } = useAuth()
  const idNum = Number(periodId)

  const canFinalize = user?.role === 'ADMIN' || user?.role === 'LEADERSHIP'

  const [period, setPeriod] = useState<PayrollPeriod | null>(null)
  const [entries, setEntries] = useState<PayrollEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [draftDeductions, setDraftDeductions] = useState<Record<number, string>>({})

  const isDraft = period?.status === 'DRAFT'

  async function loadAll() {
    if (!Number.isFinite(idNum) || idNum <= 0) return
    setLoading(true)
    try {
      const p = await fetchPayrollPeriod(idNum)
      const e = await fetchPayrollEntries(idNum)
      setPeriod(p)
      setNotes(p.notes ?? '')
      setEntries(e)
      const nextDed: Record<number, string> = {}
      for (const row of e) nextDed[row.id] = String(row.deductions_idr ?? '0')
      setDraftDeductions(nextDed)
    } catch (err) {
      setPeriod(null)
      alert.error('Payroll', axiosDetail(err) ?? String((err as Error)?.message ?? err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idNum])

  async function handleSaveNotes() {
    if (!period || !isDraft) return
    setBusy(true)
    try {
      const p = await patchPayrollPeriodNotes(period.id, notes)
      setPeriod(p)
      alert.success('Catatan disimpan.')
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  async function handleGenerate() {
    if (!period) return
    setBusy(true)
    try {
      const result = await generatePayrollPeriod(period.id)
      setPeriod(result.period)
      alert.success(
        'Data digenerate ulang.',
        `${result.entries_created_or_refreshed} entri diperbarui.`
      )
      await loadAll()
    } catch (e) {
      alert.error('Generate gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  async function handleFinalize() {
    if (!period || !canFinalize) return
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(
            `Kunci periode ${formatPayrollWeekLabel(period.pay_date, period.period_start_date, period.period_end_date)}? Potongan tidak bisa diubah setelah dikunci.`
          )
        : false
    if (!ok) return
    setBusy(true)
    try {
      const p = await finalizePayrollPeriod(period.id)
      setPeriod(p)
      alert.success('Periode dikunci', 'Slip final siap bagi pegawai.')
      await loadAll()
    } catch (e) {
      alert.error('Finalize gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  async function saveEntryDeduction(row: PayrollEntryRow) {
    if (!period || !isDraft) return
    const raw = draftDeductions[row.id] ?? ''
    const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) {
      alert.error('Validasi', 'Potongan harus bilangan tidak negatif.')
      return
    }
    setBusy(true)
    try {
      const updated = await patchPayrollEntry(period.id, row.id, { deductions_idr: raw })
      setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      setDraftDeductions((d) => ({ ...d, [row.id]: String(updated.deductions_idr) }))
      alert.success('Entri diperbarui.')
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  if (!Number.isFinite(idNum) || idNum <= 0) {
    return <Navigate to="/admin/gaji" replace />
  }

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar</PageBackLink>
        {loading && !period ? (
          <p className="text-on-surface-variant text-sm">Memuat…</p>
        ) : period ? (
          <>
            <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
              {formatPayrollWeekLabel(
                period.pay_date,
                period.period_start_date,
                period.period_end_date
              )}
            </h1>
            <div className="text-on-surface-variant mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={period.status === 'FINALIZED' ? 'default' : 'secondary'}>
                {period.status === 'FINALIZED' ? 'Dikunci' : 'Draft'}
              </Badge>
              {period.finalized_at ? (
                <span className="tabular-nums">
                  Final: {new Date(period.finalized_at).toLocaleString('id-ID')}
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-destructive text-sm">Periode tidak ditemukan.</p>
        )}
      </div>

      {period ? (
        <>
          <section className="border-outline-variant space-y-4 rounded-xl border p-6">
            <Label htmlFor="per-notes">Catatan periode</Label>
            <textarea
              id="per-notes"
              disabled={busy || period.status !== 'DRAFT'}
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={3}
              className={cn(
                'border-input bg-field placeholder:text-muted-foreground min-h-[5.25rem] w-full rounded-lg border px-3 py-2 text-sm outline-none transition-[color,box-shadow]',
                'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
            {period.status === 'DRAFT' ? (
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleSaveNotes()}>
                Simpan catatan
              </Button>
            ) : null}
          </section>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => void handleGenerate()}>
              Bangkitkan ulang dari presensi terbaru dan gaji pokok
            </Button>
            {canFinalize && period.status === 'DRAFT' ? (
              <Button type="button" disabled={busy} onClick={() => void handleFinalize()}>
                Kunci periode gaji (finalize)
              </Button>
            ) : null}
          </div>

          <section className="space-y-4">
            <h2 className="text-on-surface text-sm font-semibold tracking-wide uppercase">Entri per pegawai</h2>
            {entries.length === 0 ? (
              <p className="text-on-surface-variant text-sm">
                Belum ada entri. Jalankan pembangkit dari presensi menggunakan tombol di atas.
              </p>
            ) : (
              <div className="border-outline-variant overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead className="text-right tabular-nums">Gaji pokok (snapshot)</TableHead>
                      <TableHead className="text-right">Hadir</TableHead>
                      <TableHead className="text-right">Telat</TableHead>
                      <TableHead>Potongan</TableHead>
                      <TableHead className="text-right">Bersih</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.employee_name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatIdr(row.base_salary_snapshot_idr)}
                        </TableCell>
                        <TableCell className="text-right">{row.days_present}</TableCell>
                        <TableCell className="text-right">{row.late_count}</TableCell>
                        <TableCell>
                          {period.status === 'DRAFT' ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <Input
                                className="h-9 w-[120px]"
                                inputMode="decimal"
                                value={draftDeductions[row.id] ?? ''}
                                onChange={(e) =>
                                  setDraftDeductions((d) => ({
                                    ...d,
                                    [row.id]: e.target.value,
                                  }))
                                }
                                disabled={busy}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => void saveEntryDeduction(row)}
                              >
                                Simpan
                              </Button>
                            </div>
                          ) : (
                            formatIdr(row.deductions_idr)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatIdr(row.net_pay_idr)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
