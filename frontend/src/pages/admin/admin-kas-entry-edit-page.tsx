import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { OperationalCashEntryForm } from '@/components/admin/kas/operational-cash-entry-form'
import { useOperationalCashEntryQuery } from '@/hooks/use-expenses-query'

export function AdminKasEntryEditPage() {
  const navigate = useNavigate()
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: entry, isLoading, isError } = useOperationalCashEntryQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to="/admin/kas/entri" replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat transaksi…</p>
  }

  if (isError || !entry) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/kas/entri"
          className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
        >
          ← Kembali ke daftar
        </Link>
        <p className="text-destructive text-sm">Transaksi tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/kas/entri"
        className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
      >
        ← Kembali ke transaksi
      </Link>
      <OperationalCashEntryForm
        key={`${entry.id}-${entry.updated_at}`}
        mode="edit"
        initial={entry}
        onCancel={() => navigate('/admin/kas/entri')}
        onSaved={() => navigate('/admin/kas/entri')}
      />
    </div>
  )
}
