import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { SalesOrderForm } from '@/components/admin/orders/sales-order-form'

export function AdminSalesOrderEditPage() {
  const navigate = useNavigate()
  const { orderId: idParam } = useParams<{ orderId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  if (!validId) {
    return <Navigate to="/admin/pesanan/penjualan" replace />
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/admin/pesanan/penjualan/${id}`}
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke detail order
        </Link>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Ubah order penjualan
        </h2>
      </div>

      <SalesOrderForm
        mode="edit"
        orderId={id}
        onCancel={() => navigate(`/admin/pesanan/penjualan/${id}`)}
        onSaved={(savedId) => navigate(`/admin/pesanan/penjualan/${savedId}`)}
      />
    </div>
  )
}
