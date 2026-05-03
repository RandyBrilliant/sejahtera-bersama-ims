import { Link, useNavigate } from 'react-router-dom'

import { OperationalCashEntryForm } from '@/components/admin/kas/operational-cash-entry-form'

export function AdminKasEntryNewPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <Link
        to="/admin/kas/entri"
        className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
      >
        ← Kembali ke transaksi
      </Link>
      <OperationalCashEntryForm
        mode="create"
        initial={null}
        onCancel={() => navigate('/admin/kas/entri')}
        onSaved={() => navigate('/admin/kas/entri')}
      />
    </div>
  )
}
