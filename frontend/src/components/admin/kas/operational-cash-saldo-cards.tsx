import { Banknote, Landmark, Wallet } from 'lucide-react'

import { PAYMENT_METHOD_LABEL } from '@/constants/expenses'
import { useOperationalCashSaldoQuery } from '@/hooks/use-expenses-query'
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/types/expenses'

const STAT_NUMBER_CLASS =
  'font-heading text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl'

function saldoToneClass(amount: number): string {
  if (amount > 0) return 'text-emerald-700 dark:text-emerald-400'
  if (amount < 0) return 'text-destructive'
  return 'text-on-surface'
}

function methodOf(
  rows: { payment_method: PaymentMethod; saldo_idr: number; income_idr: number; expense_idr: number; line_count: number }[] | undefined,
  method: PaymentMethod
) {
  return rows?.find((r) => r.payment_method === method)
}

export function OperationalCashSaldoCards() {
  const { data, isPending, isError } = useOperationalCashSaldoQuery()

  const cash = methodOf(data?.by_payment_method, 'CASH')
  const transfer = methodOf(data?.by_payment_method, 'TRANSFER')
  const saldo = data?.saldo_idr ?? 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest relative overflow-hidden rounded-xl border p-4 sm:p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-primary/70" />
          <div className="text-on-surface-variant mb-2 flex items-center justify-between gap-2 text-xs font-semibold tracking-wider uppercase">
            <span>Saldo saat ini</span>
            <Wallet className="text-primary size-4" />
          </div>
          <p className={cn(STAT_NUMBER_CLASS, isPending ? 'text-on-surface-variant' : saldoToneClass(saldo))}>
            {isPending ? '—' : formatIdr(saldo)}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
            {data
              ? `Pemasukan ${formatIdr(data.income_idr)} − pengeluaran ${formatIdr(data.expense_idr)}`
              : 'Pemasukan − pengeluaran dari seluruh entri kas.'}
          </p>
        </div>

        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest relative overflow-hidden rounded-xl border p-4 sm:p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500/85 via-amber-500 to-amber-600/85" />
          <div className="text-on-surface-variant mb-2 flex items-center justify-between gap-2 text-xs font-semibold tracking-wider uppercase">
            <span>{PAYMENT_METHOD_LABEL.CASH}</span>
            <Banknote className="size-4 text-amber-700 dark:text-amber-300" />
          </div>
          <p
            className={cn(
              STAT_NUMBER_CLASS,
              isPending ? 'text-on-surface-variant' : saldoToneClass(cash?.saldo_idr ?? 0)
            )}
          >
            {isPending ? '—' : formatIdr(cash?.saldo_idr ?? 0)}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
            {cash
              ? `${cash.line_count.toLocaleString('id-ID')} baris · masuk ${formatIdr(cash.income_idr)}`
              : 'Saldo tunai dari entri metode cash.'}
          </p>
        </div>

        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest relative overflow-hidden rounded-xl border p-4 sm:p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500/85 via-sky-500 to-sky-600/85" />
          <div className="text-on-surface-variant mb-2 flex items-center justify-between gap-2 text-xs font-semibold tracking-wider uppercase">
            <span>{PAYMENT_METHOD_LABEL.TRANSFER}</span>
            <Landmark className="size-4 text-sky-700 dark:text-sky-300" />
          </div>
          <p
            className={cn(
              STAT_NUMBER_CLASS,
              isPending ? 'text-on-surface-variant' : saldoToneClass(transfer?.saldo_idr ?? 0)
            )}
          >
            {isPending ? '—' : formatIdr(transfer?.saldo_idr ?? 0)}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
            {transfer
              ? `${transfer.line_count.toLocaleString('id-ID')} baris · masuk ${formatIdr(transfer.income_idr)}`
              : 'Saldo transfer dari entri metode transfer.'}
          </p>
        </div>
      </div>
      {isError ? (
        <p className="text-destructive text-sm">Gagal memuat saldo kas. Muat ulang halaman.</p>
      ) : null}
    </div>
  )
}
