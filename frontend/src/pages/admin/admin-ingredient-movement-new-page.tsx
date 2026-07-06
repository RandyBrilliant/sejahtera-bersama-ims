import { IngredientStockMovementForm } from '@/components/admin/inventory/ingredient-stock-movement-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/gudang/mutasi-bahan'

export function AdminIngredientMovementNewPage() {
  const goBack = useGoBack()

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke mutasi bahan</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Catat mutasi bahan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Pilih baris stok bahan, arah mutasi, dan kuantitas. Stok keluar ditolak jika tidak cukup.
        </p>
      </div>

      <IngredientStockMovementForm
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
