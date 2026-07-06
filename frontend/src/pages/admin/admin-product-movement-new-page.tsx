import { ProductStockMovementForm } from '@/components/admin/inventory/product-stock-movement-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/gudang/mutasi-produk'

export function AdminProductMovementNewPage() {
  const goBack = useGoBack()

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke mutasi produk</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Catat mutasi produk
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Pilih varian, arah mutasi, dan kuantitas dalam kilogram. Bonus hanya berlaku untuk
          masuk (IN).
        </p>
      </div>

      <ProductStockMovementForm
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
