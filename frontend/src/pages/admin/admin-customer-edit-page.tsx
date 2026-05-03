import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { CustomerForm } from '@/components/admin/customers/customer-form'
import { useCustomerQuery } from '@/hooks/use-purchase-query'

export function AdminCustomerEditPage() {
  const navigate = useNavigate()
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: customer, isLoading, isError } = useCustomerQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to="/admin/pelanggan" replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat pelanggan…</p>
  }

  if (isError || !customer) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/pelanggan"
          className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
        >
          ← Kembali ke daftar
        </Link>
        <p className="text-destructive text-sm">Pelanggan tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/pelanggan"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke daftar pelanggan
        </Link>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Edit pelanggan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Perbarui kontak atau status aktif. Pelanggan nonaktif disembunyikan dari dropdown pesanan
          baru.
        </p>
      </div>

      <CustomerForm
        mode="edit"
        initial={customer}
        onCancel={() => navigate('/admin/pelanggan')}
        onSaved={() => navigate('/admin/pelanggan')}
      />
    </div>
  )
}
