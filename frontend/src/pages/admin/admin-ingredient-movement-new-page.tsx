import { IngredientStockMovementWizard } from '@/components/admin/inventory/ingredient-stock-movement-wizard'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/gudang/mutasi-bahan'

export function AdminIngredientMovementNewPage() {
  const goBack = useGoBack()

  return (
    <div className="space-y-6">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke penerimaan bahan</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[28px] md:leading-9">
          Catat penerimaan bahan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-base leading-relaxed">
          Isi penerimaan (masuk) atau pengeluaran (keluar) langkah demi langkah, seperti catat
          produksi.
        </p>
      </div>

      <IngredientStockMovementWizard
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
