import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { PurchaseOrderForm } from '@/components/admin/orders/purchase-order-form'

export function AdminPurchaseOrderEditPage() {
  const navigate = useNavigate()
  const { orderId: idParam } = useParams<{ orderId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  if (!validId) {
    return <Navigate to="/admin/pesanan/pembelian" replace />
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/admin/pesanan/pembelian/${id}`}
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke detail order
        </Link>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Ubah order pembelian
        </h2>
      </div>

      <PurchaseOrderForm
        mode="edit"
        orderId={id}
        onCancel={() => navigate(`/admin/pesanan/pembelian/${id}`)}
        onSaved={(savedId) => navigate(`/admin/pesanan/pembelian/${savedId}`)}
      />
    </div>
  )
}
