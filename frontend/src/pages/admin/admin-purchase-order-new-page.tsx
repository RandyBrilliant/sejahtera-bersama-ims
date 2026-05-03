import { Link, useNavigate } from 'react-router-dom'

import { PurchaseOrderForm } from '@/components/admin/orders/purchase-order-form'

export function AdminPurchaseOrderNewPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/pesanan/pembelian"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke pembelian bahan
        </Link>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Order pembelian baru
        </h2>
      </div>

      <PurchaseOrderForm
        mode="create"
        onCancel={() => navigate('/admin/pesanan/pembelian')}
        onSaved={(id) => navigate(`/admin/pesanan/pembelian/${id}`)}
      />
    </div>
  )
}
