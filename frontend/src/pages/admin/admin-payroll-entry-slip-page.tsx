import { Navigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { fetchPayrollEntrySlip } from '@/api/payroll'
import { PayrollSlipPageShell } from '@/components/admin/payroll/payroll-slip-page-shell'
import { alert } from '@/lib/alert'
import type { PayrollSlipDetail } from '@/types/payroll'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

export function AdminPayrollEntrySlipPage() {
  const { periodId, entryId } = useParams<{ periodId: string; entryId: string }>()
  const periodNum = Number(periodId)
  const entryNum = Number(entryId)
  const [slip, setSlip] = useState<PayrollSlipDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!Number.isFinite(periodNum) || !Number.isFinite(entryNum)) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await fetchPayrollEntrySlip(periodNum, entryNum)
        if (!cancelled) setSlip(data)
      } catch (e) {
        if (!cancelled) {
          setSlip(null)
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
  }, [periodNum, entryNum])

  if (!Number.isFinite(periodNum) || !Number.isFinite(entryNum)) {
    return <Navigate to="/admin/gaji" replace />
  }

  return (
    <PayrollSlipPageShell
      slip={slip}
      loading={loading}
      backFallback={`/admin/gaji/${periodNum}`}
      backLabel="← Kembali ke periode"
    />
  )
}
