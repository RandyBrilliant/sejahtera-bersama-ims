import { Navigate, useParams } from 'react-router-dom'

import { OperationalCashEntryForm } from '@/components/admin/kas/operational-cash-entry-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useOperationalCashEntryQuery } from '@/hooks/use-expenses-query'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/kas/entri'

export function AdminKasEntryEditPage() {
  const goBack = useGoBack()
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: entry, isLoading, isError } = useOperationalCashEntryQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat transaksi…</p>
  }

  if (isError || !entry) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={LIST_PATH} className="mb-0">
          ← Kembali ke daftar
        </PageBackLink>
        <p className="text-destructive text-sm">Transaksi tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBackLink fallback={LIST_PATH} className="mb-0">
        ← Kembali ke transaksi
      </PageBackLink>
      <OperationalCashEntryForm
        key={`${entry.id}-${entry.updated_at}`}
        mode="edit"
        initial={entry}
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
