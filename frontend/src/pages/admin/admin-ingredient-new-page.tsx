import { IngredientForm } from '@/components/admin/inventory/ingredient-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/gudang/bahan-baku'

export function AdminIngredientNewPage() {
  const goBack = useGoBack()

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar bahan</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Tambah bahan baku
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Nama bahan unik dalam konteks yang Anda kelola. Satuan dipakai konsisten untuk stok &
          mutasi.
        </p>
      </div>

      <IngredientForm
        mode="create"
        initial={null}
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
