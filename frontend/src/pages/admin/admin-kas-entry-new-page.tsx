import { OperationalCashEntryForm } from '@/components/admin/kas/operational-cash-entry-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/kas/entri'

export function AdminKasEntryNewPage() {
  const goBack = useGoBack()

  return (
    <div className="space-y-6">
      <PageBackLink fallback={LIST_PATH} className="mb-0">
        ← Kembali ke transaksi
      </PageBackLink>
      <OperationalCashEntryForm
        mode="create"
        initial={null}
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
