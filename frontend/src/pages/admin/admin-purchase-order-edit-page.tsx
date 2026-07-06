import { Navigate, useParams } from 'react-router-dom'

import { PurchaseOrderForm } from '@/components/admin/orders/purchase-order-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/pesanan/pembelian'

export function AdminPurchaseOrderEditPage() {
  const goBack = useGoBack()
  const { orderId: idParam } = useParams<{ orderId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0
  const detailPath = `/admin/pesanan/pembelian/${id}`

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={detailPath}>← Kembali ke detail order</PageBackLink>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Ubah order pembelian
        </h2>
      </div>

      <PurchaseOrderForm
        mode="edit"
        orderId={id}
        onCancel={() => goBack(detailPath)}
        onSaved={() => goBack(detailPath)}
      />
    </div>
  )
}
