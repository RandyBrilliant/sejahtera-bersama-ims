import { Banknote, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { postPayrollPeriodToCash } from '@/api/payroll'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PAYMENT_METHOD_LABEL } from '@/constants/expenses'
import { expensesKeys } from '@/hooks/use-expenses-query'
import { alert } from '@/lib/alert'
import { formatIdr, toFiniteNumber } from '@/lib/format-idr'
import type { PayrollEntryRow, PayrollPeriod } from '@/types/payroll'
import { isAxiosError } from 'axios'

type Props = {
  period: PayrollPeriod
  entries: PayrollEntryRow[]
  busy: boolean
  onPeriodUpdated: (period: PayrollPeriod) => void
}

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

export function PayrollPeriodTotals({ period, entries, busy, onPeriodUpdated }: Props) {
  const queryClient = useQueryClient()
  const postedMethod = period.gaji_cash_payment_method === 'TRANSFER' ? 'TRANSFER' : 'CASH'
  const [method, setMethod] = useState<'CASH' | 'TRANSFER'>(postedMethod)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    setMethod(postedMethod)
  }, [postedMethod])

  const totals = useMemo(() => {
    const sum = (key: keyof PayrollEntryRow) =>
      entries.reduce((acc, row) => acc + toFiniteNumber(row[key] as string | number), 0)
    return {
      gross: sum('gross_idr'),
      bonus: sum('bonus_idr'),
      pinjaman: sum('advance_deduction_idr'),
      potongan: sum('deductions_idr'),
      net: sum('net_pay_idr'),
    }
  }, [entries])

  async function handlePostToCash() {
    setPosting(true)
    try {
      const result = await postPayrollPeriodToCash(period.id, method)
      onPeriodUpdated(result.period)
      void queryClient.invalidateQueries({ queryKey: expensesKeys.all })
      alert.success(
        period.gaji_cash_entry_id ? 'Kas gaji diperbarui' : 'Dicatat ke kas',
        `Total gaji bersih ${formatIdr(result.amount_idr)} masuk ke transaksi operasional dan mengurangi saldo dana.`
      )
    } catch (err) {
      alert.error('Gagal mencatat ke kas', axiosDetail(err) ?? 'Coba lagi.')
    } finally {
      setPosting(false)
    }
  }

  const alreadyPosted = Boolean(period.gaji_cash_entry_id)
  const isFinalized = period.status === 'FINALIZED'

  return (
    <section className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <p className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
            Total kotor
          </p>
          <p className="text-on-surface mt-1 font-heading text-xl font-semibold tabular-nums">
            {formatIdr(totals.gross)}
          </p>
        </div>
        <div className="border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <p className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">Bonus</p>
          <p className="text-on-surface mt-1 font-heading text-xl font-semibold tabular-nums">
            {formatIdr(totals.bonus)}
          </p>
        </div>
        <div className="border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <p className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
            Pinjaman
          </p>
          <p className="text-on-surface mt-1 font-heading text-xl font-semibold tabular-nums">
            {formatIdr(totals.pinjaman)}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">Sudah tercatat ke kas per baris pinjam</p>
        </div>
        <div className="border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <p className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
            Potongan
          </p>
          <p className="text-on-surface mt-1 font-heading text-xl font-semibold tabular-nums">
            {formatIdr(totals.potongan)}
          </p>
        </div>
        <div className="border-outline-variant bg-surface-container-lowest relative overflow-hidden rounded-xl border p-4">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-primary/70" />
          <p className="text-on-surface-variant flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
            <Wallet className="size-3.5" /> Total bersih (uang gaji)
          </p>
          <p className="text-on-surface mt-1 font-heading text-xl font-semibold tabular-nums">
            {formatIdr(totals.net)}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">
            {isFinalized
              ? 'Nominal yang masuk ke transaksi operasional saat tutup buku'
              : 'Nominal yang akan dicatat ke kas saat tutup buku'}
          </p>
        </div>
      </div>

      <div className="border-outline-variant bg-surface-container-lowest flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-on-surface text-sm font-medium">Kas operasional & saldo dana</p>
          <p className="text-on-surface-variant mt-0.5 text-xs">
            {alreadyPosted ? (
              <>
                Sudah tercatat di{' '}
                <Link to="/admin/kas/entri" className="text-primary font-medium hover:underline">
                  transaksi operasional
                </Link>{' '}
                (Gaji & upah
                {period.gaji_cash_amount_idr != null
                  ? ` ${formatIdr(toFiniteNumber(period.gaji_cash_amount_idr))}`
                  : ''}
                ) — saldo dana sudah dikurangi.
              </>
            ) : isFinalized ? (
              'Periode sudah ditutup buku tapi belum ada entri kas. Catat sekarang agar saldo dana berkurang.'
            ) : (
              'Saat tutup buku, total gaji bersih dicatat sebagai pengeluaran Gaji & upah dan mengurangi saldo dana.'
            )}
          </p>
        </div>
        {isFinalized ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={method}
              onValueChange={(v) => setMethod(v as 'CASH' | 'TRANSFER')}
              disabled={busy || posting}
            >
              <SelectTrigger className="border-outline-variant w-[9.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">{PAYMENT_METHOD_LABEL.CASH}</SelectItem>
                <SelectItem value="TRANSFER">{PAYMENT_METHOD_LABEL.TRANSFER}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={busy || posting || entries.length === 0 || totals.net <= 0}
              onClick={() => void handlePostToCash()}
              className="gap-2"
            >
              <Banknote className="size-4" />
              {posting ? 'Mencatat…' : alreadyPosted ? 'Perbarui kas gaji' : 'Catat ke kas'}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}
