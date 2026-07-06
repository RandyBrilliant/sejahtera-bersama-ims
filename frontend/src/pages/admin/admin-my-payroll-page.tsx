import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { fetchMyPayrollSlips } from '@/api/payroll'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { alert } from '@/lib/alert'
import { formatIdr } from '@/lib/format-idr'
import { formatKgAmount } from '@/lib/format-kg'
import { formatPayrollWeekLabel } from '@/lib/payroll-week'
import type { MyPayrollSlip } from '@/types/payroll'
import { PAY_TYPE_LABEL } from '@/types/payroll'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}


export function AdminMyPayrollPage() {
  const [rows, setRows] = useState<MyPayrollSlip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await fetchMyPayrollSlips()
        if (!cancelled) setRows(data.results)
      } catch (e) {
        if (!cancelled) {
          alert.error('Slip gaji', axiosDetail(e) ?? String((e as Error)?.message ?? e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Slip gaji saya
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Hanya slip dari periode yang sudah dikunci (finalized) akan muncul.
        </p>
      </div>

      {loading ? (
        <p className="text-on-surface-variant text-sm">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="text-on-surface-variant text-sm">
          Belum ada slip finalize mengenai Anda. Hubungi HR atau keuangan bila Anda merasa ada yang kurang.
        </p>
      ) : (
        <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Detail</TableHead>
                <TableHead className="text-right">Kotor</TableHead>
                <TableHead className="text-right">Bonus</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right">Bersih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isKupas = r.pay_type_snapshot === 'PIECE_RATE'
                return (
                  <TableRow key={r.period_id}>
                    <TableCell>
                      <Link
                        to={`/admin/profil/slip-gaji/${r.period_id}`}
                        className="text-primary font-medium hover:underline"
                      >
                        {formatPayrollWeekLabel(
                          r.pay_date,
                          r.period_start_date,
                          r.period_end_date
                        )}
                      </Link>
                      {r.finalized_at ? (
                        <div className="text-on-surface-variant text-xs tabular-nums">
                          {new Date(r.finalized_at).toLocaleString('id-ID')}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {PAY_TYPE_LABEL[r.pay_type_snapshot]}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {isKupas ? (
                        <span>{formatKgAmount(r.total_kg, true)}</span>
                      ) : (
                        <span>
                          {r.days_present} hari, {r.late_count} telat
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIdr(Number(r.gross_idr))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIdr(Number(r.bonus_idr))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIdr(
                        Number(r.deductions_idr) + Number(r.advance_deduction_idr)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatIdr(Number(r.net_pay_idr))}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
