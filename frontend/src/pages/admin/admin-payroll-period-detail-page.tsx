import type { ChangeEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
  fetchPayrollEntries,
  fetchPayrollPeriod,
  finalizePayrollPeriod,
  generatePayrollPeriod,
  patchPayrollEntry,
  patchPayrollPeriodNotes,
  unfinalizePayrollPeriod,
} from '@/api/payroll'
import { PayrollLoanModal } from '@/components/admin/payroll/payroll-loan-modal'
import { PayrollPeriodTotals } from '@/components/admin/payroll/payroll-period-totals'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { PAYMENT_METHOD_LABEL } from '@/constants/expenses'
import { useAuth } from '@/hooks/use-auth'
import { expensesKeys } from '@/hooks/use-expenses-query'
import { alert } from '@/lib/alert'
import { formatIdr } from '@/lib/format-idr'
import { formatKgAmount } from '@/lib/format-kg'
import { formatPayrollWeekLabel } from '@/lib/payroll-week'
import { cn } from '@/lib/utils'
import { PageBackLink } from '@/components/navigation/page-back-link'
import type { PayrollEntryRow, PayrollPeriod } from '@/types/payroll'
import { PAY_CADENCE_LABEL, PAY_TYPE_LABEL } from '@/types/payroll'
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
}

export function AdminPayrollPeriodDetailPage() {
  const { periodId } = useParams<{ periodId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const idNum = Number(periodId)

  const canFinalize = user?.role === 'ADMIN' || user?.role === 'LEADERSHIP'
  const canUnlock = canFinalize


  const [period, setPeriod] = useState<PayrollPeriod | null>(null)
  const [entries, setEntries] = useState<PayrollEntryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notes, setNotes] = useState('')
  const [draft, setDraft] = useState<Record<number, EntryDraft>>({})
  const [loanEntry, setLoanEntry] = useState<PayrollEntryRow | null>(null)
  const [tutupBukuMethod, setTutupBukuMethod] = useState<'CASH' | 'TRANSFER'>('CASH')

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
    if (!period) return
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

  async function handleTogglePaidOut(row: PayrollEntryRow, paidOut: boolean) {
    if (!period) return
    setBusy(true)
    try {
      const updated = await patchPayrollEntry(period.id, row.id, { paid_out: paidOut })
      setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
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
            `Tutup buku periode ${formatPayrollWeekLabel(period.pay_date, period.period_start_date, period.period_end_date, period.cadence)}?\n\nTotal gaji bersih akan dicatat ke transaksi operasional dan mengurangi saldo dana. Penyesuaian tidak bisa diubah setelah dikunci.`
          )
        : false
    if (!ok) return
    setBusy(true)
    try {
      const p = await finalizePayrollPeriod(period.id, tutupBukuMethod)
      setPeriod(p)
      void queryClient.invalidateQueries({ queryKey: expensesKeys.all })
      alert.success(
        'Tutup buku selesai',
        p.gaji_cash_entry_id
          ? 'Slip final siap. Total gaji bersih sudah masuk ke transaksi operasional.'
          : 'Slip final siap bagi pegawai.'
      )
      await loadAll()
    } catch (e) {
      alert.error('Tutup buku gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  async function handleUnfinalize() {
    if (!period || !canUnlock || period.status !== 'FINALIZED') return
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(
            `Buka kunci periode ${formatPayrollWeekLabel(period.pay_date, period.period_start_date, period.period_end_date, period.cadence)}?\n\nEntri kas gaji periode ini akan dihapus (saldo dana dikembalikan). Periode kembali draft agar bisa diubah, lalu tutup buku ulang setelah selesai.`
          )
        : false
    if (!ok) return
    setBusy(true)
    try {
      const p = await unfinalizePayrollPeriod(period.id)
      setPeriod(p)
      void queryClient.invalidateQueries({ queryKey: expensesKeys.all })
      alert.success('Kunci dibuka', 'Periode kembali draft.')
      await loadAll()
    } catch (e) {
      alert.error('Buka kunci gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
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
    if (deductions === null || bonus === null) {
      alert.error('Validasi', 'Nilai harus bilangan tidak negatif.')
      return
    }
    setBusy(true)
    try {
      const updated = await patchPayrollEntry(period.id, row.id, {
        deductions_idr: d.deductions_idr,
        bonus_idr: d.bonus_idr,
      })
      setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      setDraft((prev) => ({
        ...prev,
        [row.id]: {
          deductions_idr: String(updated.deductions_idr),
          bonus_idr: String(updated.bonus_idr),
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
                period.period_end_date,
                period.cadence
              )}
            </h1>
            <div className="text-on-surface-variant mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">
                {PAY_CADENCE_LABEL[period.cadence] ?? period.cadence}
              </Badge>
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
              disabled={busy}
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={3}
              className={cn(
                'border-input bg-field placeholder:text-muted-foreground min-h-[5.25rem] w-full rounded-lg border px-3 py-2 text-sm outline-none transition-[color,box-shadow]',
                'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
              )}
            />
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleSaveNotes()}>
              Simpan catatan
            </Button>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" disabled={busy || !isDraft} onClick={() => void handleGenerate()}>
              Bangkitkan dari pekerjaan belum dibayar (presensi / kupas)
            </Button>
            {canFinalize && period.status === 'DRAFT' ? (
              <>
                <Select
                  value={tutupBukuMethod}
                  onValueChange={(v) => setTutupBukuMethod(v as 'CASH' | 'TRANSFER')}
                  disabled={busy}
                >
                  <SelectTrigger className="border-outline-variant w-[9.5rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{PAYMENT_METHOD_LABEL.CASH}</SelectItem>
                    <SelectItem value="TRANSFER">{PAYMENT_METHOD_LABEL.TRANSFER}</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" disabled={busy || entries.length === 0} onClick={() => void handleFinalize()}>
                  Tutup buku
                </Button>
              </>
            ) : null}
            {canUnlock && period.status === 'FINALIZED' ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => void handleUnfinalize()}>
                Buka kunci periode
              </Button>
            ) : null}
          </div>

          {entries.length > 0 ? (
            <PayrollPeriodTotals
              period={period}
              entries={entries}
              busy={busy}
              onPeriodUpdated={setPeriod}
            />
          ) : null}

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-on-surface text-sm font-semibold tracking-wide uppercase">
                Entri per pegawai
              </h2>
              {entries.length > 0 ? (
                <p className="text-on-surface-variant text-xs">
                  Sudah dibayar: {entries.filter((e) => e.paid_out).length} / {entries.length}
                </p>
              ) : null}
            </div>
            {entries.length === 0 ? (
              <p className="text-on-surface-variant text-sm">
                Belum ada entri. Jalankan pembangkit menggunakan tombol di atas.
              </p>
            ) : (
              <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">Bayar</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead className="text-right">Hadir / kg</TableHead>
                      <TableHead className="text-right">Telat</TableHead>
                      <TableHead className="text-right">Kotor</TableHead>
                      <TableHead>Bonus (TBH)</TableHead>
                      <TableHead>Pinjaman</TableHead>
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
                        <TableRow key={row.id} className={row.paid_out ? 'bg-primary/5' : undefined}>
                          <TableCell className="text-center">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={row.paid_out}
                                disabled={busy}
                                onCheckedChange={(v) =>
                                  void handleTogglePaidOut(row, v === true)
                                }
                                aria-label={`Tandai ${row.employee_name} sudah dibayar`}
                              />
                            </div>
                          </TableCell>
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
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              onClick={() => setLoanEntry(row)}
                            >
                              {formatIdr(row.advance_deduction_idr)}
                              {(row.loan_item_count ?? 0) > 0
                                ? ` (${row.loan_item_count})`
                                : isDraft
                                  ? ' +'
                                  : ''}
                            </Button>
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

          <PayrollLoanModal
            open={!!loanEntry}
            onOpenChange={(o) => {
              if (!o) setLoanEntry(null)
            }}
            periodId={period.id}
            payDate={period.pay_date}
            entry={loanEntry}
            canEdit={isDraft}
            onEntryUpdated={(updated) => {
              setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
              setLoanEntry(updated)
            }}
          />
        </>
      ) : null}
    </div>
  )
}
