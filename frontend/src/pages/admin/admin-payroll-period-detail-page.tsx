import type { ChangeEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
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
import { formatKgAmount } from '@/lib/format-kg'
import { formatPayrollWeekLabel } from '@/lib/payroll-week'
import { cn } from '@/lib/utils'
import { PageBackLink } from '@/components/navigation/page-back-link'
import type { PayrollEntryRow, PayrollPeriod } from '@/types/payroll'
import { PAY_TYPE_LABEL } from '@/types/payroll'
import { isAxiosError } from 'axios'

const LIST_PATH = '/admin/gaji'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

type EntryDraft = {
  deductions_idr: string
  bonus_idr: string
  advance_deduction_idr: string
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
  const [draft, setDraft] = useState<Record<number, EntryDraft>>({})

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
      const next: Record<number, EntryDraft> = {}
      for (const row of e) {
        next[row.id] = {
          deductions_idr: String(row.deductions_idr ?? '0'),
          bonus_idr: String(row.bonus_idr ?? '0'),
          advance_deduction_idr: String(row.advance_deduction_idr ?? '0'),
        }
      }
      setDraft(next)
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
            `Kunci periode ${formatPayrollWeekLabel(period.pay_date, period.period_start_date, period.period_end_date)}? Penyesuaian tidak bisa diubah setelah dikunci.`
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

  function parseAmount(raw: string): number | null {
    const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) return null
    return n
  }

  async function saveEntryAdjust(row: PayrollEntryRow) {
    if (!period || !isDraft) return
    const d = draft[row.id]
    if (!d) return
    const deductions = parseAmount(d.deductions_idr)
    const bonus = parseAmount(d.bonus_idr)
    const advance = parseAmount(d.advance_deduction_idr)
    if (deductions === null || bonus === null || advance === null) {
      alert.error('Validasi', 'Nilai harus bilangan tidak negatif.')
      return
    }
    setBusy(true)
    try {
      const updated = await patchPayrollEntry(period.id, row.id, {
        deductions_idr: d.deductions_idr,
        bonus_idr: d.bonus_idr,
        advance_deduction_idr: d.advance_deduction_idr,
      })
      setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      setDraft((prev) => ({
        ...prev,
        [row.id]: {
          deductions_idr: String(updated.deductions_idr),
          bonus_idr: String(updated.bonus_idr),
          advance_deduction_idr: String(updated.advance_deduction_idr),
        },
      }))
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
              Bangkitkan dari pekerjaan belum dibayar (presensi / kupas)
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
                Belum ada entri. Jalankan pembangkit menggunakan tombol di atas.
              </p>
            ) : (
              <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-right">Hadir / kg</TableHead>
                      <TableHead className="text-right">Telat</TableHead>
                      <TableHead className="text-right">Kotor</TableHead>
                      <TableHead>Bonus (TBH)</TableHead>
                      <TableHead>Pinjam</TableHead>
                      <TableHead>Potongan</TableHead>
                      <TableHead className="text-right">Bersih</TableHead>
                      {isDraft ? <TableHead /> : <TableHead className="text-right">Slip</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((row) => {
                      const isKupas = row.pay_type_snapshot === 'PIECE_RATE'
                      const d = draft[row.id]
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.employee_name}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {PAY_TYPE_LABEL[row.pay_type_snapshot]}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {isKupas ? (
                              <span>{formatKgAmount(row.total_kg, true)}</span>
                            ) : (
                              <span>
                                {row.days_present} hari @ {formatIdr(row.daily_rate_snapshot_idr)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{isKupas ? '—' : row.late_count}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatIdr(row.gross_idr)}
                          </TableCell>
                          <TableCell>
                            {isDraft && d ? (
                              <Input
                                className="h-9 w-[100px]"
                                inputMode="decimal"
                                value={d.bonus_idr}
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [row.id]: { ...prev[row.id], bonus_idr: e.target.value },
                                  }))
                                }
                                disabled={busy}
                              />
                            ) : (
                              formatIdr(row.bonus_idr)
                            )}
                          </TableCell>
                          <TableCell>
                            {isDraft && d ? (
                              <Input
                                className="h-9 w-[100px]"
                                inputMode="decimal"
                                value={d.advance_deduction_idr}
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...prev[row.id],
                                      advance_deduction_idr: e.target.value,
                                    },
                                  }))
                                }
                                disabled={busy}
                              />
                            ) : (
                              formatIdr(row.advance_deduction_idr)
                            )}
                          </TableCell>
                          <TableCell>
                            {isDraft && d ? (
                              <Input
                                className="h-9 w-[100px]"
                                inputMode="decimal"
                                value={d.deductions_idr}
                                onChange={(e) =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [row.id]: { ...prev[row.id], deductions_idr: e.target.value },
                                  }))
                                }
                                disabled={busy}
                              />
                            ) : (
                              formatIdr(row.deductions_idr)
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatIdr(row.net_pay_idr)}
                          </TableCell>
                          {isDraft ? (
                            <TableCell>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => void saveEntryAdjust(row)}
                              >
                                Simpan
                              </Button>
                            </TableCell>
                          ) : (
                            <TableCell className="text-right">
                              <Button type="button" variant="outline" size="sm" asChild>
                                <Link to={`/admin/gaji/${period.id}/slip/${row.id}`}>Unduh PDF</Link>
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
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
