import { useRef, useState } from 'react'

import { PayrollSlipDocument } from '@/components/admin/payroll/payroll-slip-document'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { Button } from '@/components/ui/button'
import { alert } from '@/lib/alert'
import {
  downloadPayrollSlipPdf,
  payrollSlipPdfFilename,
} from '@/lib/download-payroll-slip-pdf'
import type { PayrollSlipDetail } from '@/types/payroll'

type Props = {
  slip: PayrollSlipDetail | null
  loading: boolean
  backFallback: string
  backLabel: string
}

export function PayrollSlipPageShell({ slip, loading, backFallback, backLabel }: Props) {
  const slipRef = useRef<HTMLElement>(null)
  const [downloading, setDownloading] = useState(false)

  async function handleDownloadPdf() {
    if (!slip || !slipRef.current) return
    setDownloading(true)
    try {
      const ok = await downloadPayrollSlipPdf(
        slipRef.current,
        payrollSlipPdfFilename(slip.employee_name, slip.pay_date)
      )
      if (ok) {
        alert.success('PDF', 'Slip gaji diunduh.')
      } else {
        alert.error('PDF', 'Gagal membuat file PDF. Coba lagi.')
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageBackLink fallback={backFallback}>{backLabel}</PageBackLink>
        <Button
          type="button"
          variant="outline"
          disabled={loading || downloading || !slip}
          onClick={() => void handleDownloadPdf()}
        >
          {downloading ? 'Membuat PDF…' : 'Unduh PDF'}
        </Button>
      </div>

      {loading ? (
        <p className="text-on-surface-variant text-sm">Memuat slip…</p>
      ) : slip ? (
        <PayrollSlipDocument ref={slipRef} slip={slip} />
      ) : (
        <p className="text-destructive text-sm">Slip tidak ditemukan.</p>
      )}
    </div>
  )
}
