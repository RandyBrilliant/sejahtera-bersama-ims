import { Navigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { fetchMyPayrollSlip } from '@/api/payroll'
import { PayrollSlipPageShell } from '@/components/admin/payroll/payroll-slip-page-shell'
import { alert } from '@/lib/alert'
import type { PayrollSlipDetail } from '@/types/payroll'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

export function AdminMyPayrollSlipPage() {
  const { periodId } = useParams<{ periodId: string }>()
  const periodNum = Number(periodId)
  const [slip, setSlip] = useState<PayrollSlipDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!Number.isFinite(periodNum)) return
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await fetchMyPayrollSlip(periodNum)
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
  }, [periodNum])

  if (!Number.isFinite(periodNum)) {
    return <Navigate to="/admin/profil/slip-gaji" replace />
  }

  return (
    <PayrollSlipPageShell
      slip={slip}
      loading={loading}
      backFallback="/admin/profil/slip-gaji"
      backLabel="← Kembali ke daftar slip"
    />
  )
}
