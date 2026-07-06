import { Navigate, useParams } from 'react-router-dom'

import { ProductPackagingForm } from '@/components/admin/inventory/product-packaging-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useProductPackagingQuery } from '@/hooks/use-inventory-query'
import { useGoBack } from '@/hooks/use-go-back'

const INVENTORY_PATH = '/admin/inventaris'

export function AdminInventoryPackagingEditPage() {
  const goBack = useGoBack()
  const { packagingId: idParam } = useParams<{ packagingId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: packaging, isLoading, isError } = useProductPackagingQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to={INVENTORY_PATH} replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat kemasan…</p>
  }

  if (isError || !packaging) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={INVENTORY_PATH} className="mb-0">
          ← Kembali
        </PageBackLink>
        <p className="text-destructive text-sm">Kemasan tidak ditemukan.</p>
      </div>
    )
  }

  const productEditPath = `/admin/inventaris/${packaging.product}/edit`

  return (
    <div className="space-y-6">
      <div>
        <PageBackLink fallback={productEditPath}>← Kembali ke produk</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Edit kemasan
        </h1>
        <p className="text-on-surface-variant mt-2 text-sm">
          {packaging.product_variant_name} · {packaging.label}
        </p>
      </div>

      <ProductPackagingForm
        key={packaging.id}
        mode="edit"
        productId={packaging.product}
        initial={packaging}
        onCancel={() => goBack(productEditPath)}
        onSaved={() => goBack(productEditPath)}
      />
    </div>
  )
}
