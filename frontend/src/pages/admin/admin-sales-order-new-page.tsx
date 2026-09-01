import { useNavigate } from 'react-router-dom'

import { SalesOrderForm } from '@/components/admin/orders/sales-order-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/pesanan/penjualan'

export function AdminSalesOrderNewPage() {
  const navigate = useNavigate()
  const goBack = useGoBack()

  return (
    <div className="space-y-4">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke penjualan</PageBackLink>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Order penjualan baru
        </h2>
        <p className="text-on-surface-variant mt-1 text-sm">
          Isi keranjang dalam kilogram. Tombol ± menambah atau mengurangi satu kemasan.
        </p>
      </div>

      <SalesOrderForm
        mode="create"
        onCancel={() => goBack(LIST_PATH)}
        onSaved={(oid) => navigate(`/admin/pesanan/penjualan/${oid}`)}
      />
    </div>
  )
}
