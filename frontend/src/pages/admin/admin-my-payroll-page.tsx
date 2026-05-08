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
import type { MyPayrollSlip } from '@/types/payroll'
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
        <div className="border-outline-variant overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Hadir</TableHead>
                <TableHead className="text-right">Telat</TableHead>
                <TableHead className="text-right">Gaji pokok</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right">Bersih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.period_id}>
                  <TableCell>
                    <div className="font-medium capitalize">
                      {monthLabel(r.month)} {r.year}
                    </div>
                    {r.finalized_at ? (
                      <div className="text-on-surface-variant text-xs tabular-nums">
                        {new Date(r.finalized_at).toLocaleString('id-ID')}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">{r.days_present}</TableCell>
                  <TableCell className="text-right">{r.late_count}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIdr(Number(r.base_salary_snapshot_idr))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIdr(Number(r.deductions_idr))}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatIdr(Number(r.net_pay_idr))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
