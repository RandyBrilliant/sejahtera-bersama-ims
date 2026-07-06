import { useNavigate } from 'react-router-dom'

import { PurchaseOrderForm } from '@/components/admin/orders/purchase-order-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/pesanan/pembelian'

export function AdminPurchaseOrderNewPage() {
  const navigate = useNavigate()
  const goBack = useGoBack()

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke pembelian bahan</PageBackLink>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Order pembelian baru
        </h2>
      </div>

      <PurchaseOrderForm
        mode="create"
        onCancel={() => goBack(LIST_PATH)}
        onSaved={(id) => navigate(`/admin/pesanan/pembelian/${id}`)}
      />
    </div>
  )
}
