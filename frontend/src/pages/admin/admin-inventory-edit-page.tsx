import { Navigate, useParams } from 'react-router-dom'

import { ProductForm } from '@/components/admin/inventory/product-form'
import { ProductMetadataAside } from '@/components/admin/inventory/product-metadata-aside'
import { ProductPackagingInlineTable } from '@/components/admin/inventory/product-packaging-inline-table'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useProductQuery } from '@/hooks/use-inventory-query'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/inventaris'

export function AdminInventoryEditPage() {
  const goBack = useGoBack()
  const { productId: idParam } = useParams<{ productId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: product, isLoading, isError } = useProductQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat produk…</p>
  }

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={LIST_PATH} className="mb-0">
          ← Kembali ke daftar
        </PageBackLink>
        <p className="text-destructive text-sm">Produk tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Edit produk
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Varian <span className="text-on-surface font-medium">{product.variant_name}</span>. Ubah
          data di kiri; kelola SKU di bawah.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start lg:gap-10">
        <ProductForm
          key={product.id}
          mode="edit"
          initialProduct={product}
          onCancel={() => goBack(LIST_PATH)}
          onSaved={() => goBack(LIST_PATH)}
        />
        <ProductMetadataAside product={product} />
      </div>

      <ProductPackagingInlineTable productId={product.id} />
    </div>
  )
}
