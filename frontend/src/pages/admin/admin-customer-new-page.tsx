import { Link, useNavigate } from 'react-router-dom'

import { CustomerForm } from '@/components/admin/customers/customer-form'

export function AdminCustomerNewPage() {
  const navigate = useNavigate()

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
          Tambah pelanggan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Data ini akan muncul sebagai pilihan pada form pesanan penjualan.
        </p>
      </div>

      <CustomerForm
        mode="create"
        initial={null}
        onCancel={() => navigate('/admin/pelanggan')}
        onSaved={() => navigate('/admin/pelanggan')}
      />
    </div>
  )
}
