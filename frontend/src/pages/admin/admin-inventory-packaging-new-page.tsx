import { Navigate, useParams } from 'react-router-dom'

import { ProductPackagingForm } from '@/components/admin/inventory/product-packaging-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useProductQuery } from '@/hooks/use-inventory-query'
import { useGoBack } from '@/hooks/use-go-back'

const INVENTORY_PATH = '/admin/inventaris'

export function AdminInventoryPackagingNewPage() {
  const goBack = useGoBack()
  const { productId: idParam } = useParams<{ productId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: product, isLoading, isError } = useProductQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to={INVENTORY_PATH} replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat produk…</p>
  }

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={INVENTORY_PATH} className="mb-0">
          ← Kembali
        </PageBackLink>
        <p className="text-destructive text-sm">Produk tidak ditemukan.</p>
      </div>
    )
  }

  const productEditPath = `/admin/inventaris/${product.id}/edit`

  return (
    <div className="space-y-6">
      <div>
        <PageBackLink fallback={productEditPath}>← Kembali ke produk</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Tambah kemasan
        </h1>
        <p className="text-on-surface-variant mt-2 text-sm">
          Produk:{' '}
          <span className="text-on-surface font-medium">{product.variant_name}</span>
        </p>
      </div>

      <ProductPackagingForm
        mode="create"
        productId={product.id}
        initial={null}
        onCancel={() => goBack(productEditPath)}
        onSaved={() => goBack(productEditPath)}
      />
    </div>
  )
}
