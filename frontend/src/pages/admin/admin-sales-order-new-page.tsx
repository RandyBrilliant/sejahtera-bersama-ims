import { Link, useNavigate } from 'react-router-dom'

import { SalesOrderForm } from '@/components/admin/orders/sales-order-form'

export function AdminSalesOrderNewPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/pesanan/penjualan"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke penjualan
        </Link>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Order penjualan baru
        </h2>
      </div>

      <SalesOrderForm
        mode="create"
        onCancel={() => navigate('/admin/pesanan/penjualan')}
        onSaved={(oid) => navigate(`/admin/pesanan/penjualan/${oid}`)}
      />
    </div>
  )
}
