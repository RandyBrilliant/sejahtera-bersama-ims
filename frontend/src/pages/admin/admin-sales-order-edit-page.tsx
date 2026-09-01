import { Navigate, useParams } from 'react-router-dom'

import { SalesOrderForm } from '@/components/admin/orders/sales-order-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/pesanan/penjualan'

export function AdminSalesOrderEditPage() {
  const goBack = useGoBack()
  const { orderId: idParam } = useParams<{ orderId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0
  const detailPath = `/admin/pesanan/penjualan/${id}`

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  return (
    <div className="space-y-4">
      <div>
        <PageBackLink fallback={detailPath}>← Kembali ke detail order</PageBackLink>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Ubah order penjualan
        </h2>
        <p className="text-on-surface-variant mt-1 text-sm">
          Isi keranjang dalam kilogram. Tombol ± menambah atau mengurangi satu kemasan.
        </p>
      </div>

      <SalesOrderForm
        mode="edit"
        orderId={id}
        onCancel={() => goBack(detailPath)}
        onSaved={() => goBack(detailPath)}
      />
    </div>
  )
}
