import { CustomerForm } from '@/components/admin/customers/customer-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/pelanggan'

export function AdminCustomerNewPage() {
  const goBack = useGoBack()

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar pelanggan</PageBackLink>
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
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
