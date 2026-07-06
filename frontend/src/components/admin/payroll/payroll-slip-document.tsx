import { forwardRef } from 'react'

import { APP_BRAND_NAME } from '@/constants/brand'
import { formatIdr } from '@/lib/format-idr'
import { formatKg, formatKgAmount } from '@/lib/format-kg'
import { formatPayrollWeekLabel } from '@/lib/payroll-week'
import type { PayrollSlipDetail } from '@/types/payroll'
import { PAY_TYPE_LABEL } from '@/types/payroll'

type Props = {
  slip: PayrollSlipDetail
}

function formatWorkDate(iso: string): string {
  try {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export const PayrollSlipDocument = forwardRef<HTMLElement, Props>(function PayrollSlipDocument(
  { slip },
  ref
) {
  const isKupas = slip.pay_type_snapshot === 'PIECE_RATE'
  const periodLabel = formatPayrollWeekLabel(
    slip.pay_date,
    slip.period_start_date,
    slip.period_end_date
  )

  return (
    <article
      ref={ref}
      className="border-outline-variant mx-auto max-w-2xl rounded-xl border bg-white p-6 text-black shadow-sm"
    >
      <header className="border-outline-variant border-b bg-white pb-4 text-center">
        <p className="text-lg font-bold tracking-wide">{APP_BRAND_NAME}</p>
        <h1 className="mt-1 text-base font-semibold uppercase tracking-wider">Slip Gaji</h1>
        <p className="text-on-surface-variant mt-2 text-sm">{periodLabel}</p>
        {slip.finalized_at ? (
          <p className="text-on-surface-variant mt-1 text-xs">
            Dikunci:{' '}
            {new Date(slip.finalized_at).toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        ) : null}
      </header>

      <section className="mt-4 grid gap-1 bg-white text-sm sm:grid-cols-2">
        <div>
          <span className="text-on-surface-variant">Nama: </span>
          <span className="font-medium">{slip.employee_name}</span>
        </div>
        <div>
          <span className="text-on-surface-variant">Username: </span>
          <span className="font-mono text-xs">{slip.employee_username}</span>
        </div>
        <div>
          <span className="text-on-surface-variant">Tipe gaji: </span>
          <span>{PAY_TYPE_LABEL[slip.pay_type_snapshot]}</span>
        </div>
        {!isKupas ? (
          <div>
            <span className="text-on-surface-variant">Tarif harian: </span>
            <span>{formatIdr(slip.daily_rate_snapshot_idr)}</span>
          </div>
        ) : null}
      </section>

      <section className="mt-6 bg-white">
        <h2 className="mb-2 text-xs font-semibold tracking-wide uppercase">Rincian pekerjaan</h2>
        <div className="overflow-x-auto bg-white">
          <table className="w-full border-collapse bg-white text-sm">
            <thead className="bg-white">
              <tr className="border-outline-variant border-b bg-white text-left text-xs">
                <th className="bg-white py-2 pr-2 font-semibold">Tanggal</th>
                {isKupas ? (
                  <>
                    <th className="bg-white py-2 pr-2 font-semibold">Jenis</th>
                    <th className="bg-white py-2 pr-2 text-right font-semibold">Kg</th>
                    <th className="bg-white py-2 pr-2 text-right font-semibold">Tarif/kg</th>
                  </>
                ) : (
                  <th className="bg-white py-2 pr-2 font-semibold">Keterangan</th>
                )}
                <th className="bg-white py-2 pr-2 text-right font-semibold">Bruto</th>
                {!isKupas ? (
                  <th className="bg-white py-2 text-right font-semibold">Potongan</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="bg-white">
              {slip.lines.length === 0 ? (
                <tr className="bg-white">
                  <td
                    colSpan={isKupas ? 5 : 4}
                    className="text-on-surface-variant bg-white py-4 text-center"
                  >
                    Tidak ada baris rincian.
                  </td>
                </tr>
              ) : (
                slip.lines.map((line, idx) => (
                  <tr
                    key={`${line.work_date}-${idx}`}
                    className="border-outline-variant/60 border-b bg-white"
                  >
                    <td className="bg-white py-2 pr-2 whitespace-nowrap">
                      {formatWorkDate(line.work_date)}
                    </td>
                    {isKupas ? (
                      <>
                        <td className="bg-white py-2 pr-2">{line.kupas_item_name}</td>
                        <td className="bg-white py-2 pr-2 text-right tabular-nums">
                          {formatKg(line.kg)}
                        </td>
                        <td className="bg-white py-2 pr-2 text-right tabular-nums">
                          {formatIdr(line.rate_per_kg_idr)}
                        </td>
                      </>
                    ) : (
                      <td className="bg-white py-2 pr-2 text-xs">
                        {line.is_half_day ? 'Setengah hari' : 'Hari penuh'}
                        {line.is_late ? ' · Terlambat' : ''}
                      </td>
                    )}
                    <td className="bg-white py-2 pr-2 text-right tabular-nums">
                      {formatIdr(line.gross_idr)}
                    </td>
                    {!isKupas ? (
                      <td className="bg-white py-2 text-right tabular-nums">
                        {Number(line.deduction_idr) > 0 ? formatIdr(line.deduction_idr) : '—'}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 ml-auto max-w-xs space-y-2 bg-white text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-on-surface-variant">Subtotal bruto</span>
          <span className="tabular-nums">{formatIdr(slip.gross_idr)}</span>
        </div>
        {isKupas ? (
          <div className="flex justify-between gap-4">
            <span className="text-on-surface-variant">Total kg</span>
            <span className="tabular-nums">{formatKgAmount(slip.total_kg, true)}</span>
          </div>
        ) : (
          <div className="flex justify-between gap-4">
            <span className="text-on-surface-variant">Hadir / telat</span>
            <span>
              {slip.days_present} hari / {slip.late_count} telat
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-on-surface-variant">Bonus (TBH)</span>
          <span className="tabular-nums">{formatIdr(slip.bonus_idr)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-on-surface-variant">Pinjaman (PINJAM)</span>
          <span className="tabular-nums">−{formatIdr(slip.advance_deduction_idr)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-on-surface-variant">Potongan lain</span>
          <span className="tabular-nums">−{formatIdr(slip.deductions_idr)}</span>
        </div>
        <div className="border-outline-variant flex justify-between gap-4 border-t pt-2 text-base font-semibold">
          <span>Diterima bersih</span>
          <span className="tabular-nums">{formatIdr(slip.net_pay_idr)}</span>
        </div>
      </section>

      {slip.notes?.trim() ? (
        <p className="text-on-surface-variant mt-6 text-xs">
          <span className="font-medium">Catatan: </span>
          {slip.notes}
        </p>
      ) : null}
    </article>
  )
})
