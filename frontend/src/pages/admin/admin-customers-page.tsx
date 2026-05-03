import { CustomersTable } from '@/components/admin/customers/customers-table'

export function AdminCustomersPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Pelanggan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Master data pelanggan untuk pesanan penjualan. Ubah status nonaktif jika tidak lagi
          dipakai — penghapusan hanya jika tidak ada referensi pesanan.
        </p>
      </div>

      <CustomersTable />
    </div>
  )
}
