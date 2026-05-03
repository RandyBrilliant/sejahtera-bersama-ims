import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { ProductPackagingForm } from '@/components/admin/inventory/product-packaging-form'
import { useProductQuery } from '@/hooks/use-inventory-query'

export function AdminInventoryPackagingNewPage() {
  const { productId: idParam } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: product, isLoading, isError } = useProductQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to="/admin/inventaris" replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat produk…</p>
  }

  if (isError || !product) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/inventaris"
          className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
        >
          ← Kembali
        </Link>
        <p className="text-destructive text-sm">Produk tidak ditemukan.</p>
      </div>
    )
  }

  const backToProduct = `/admin/inventaris/${product.id}/edit`

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={backToProduct}
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke produk
        </Link>
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
        onCancel={() => navigate(backToProduct)}
        onSaved={() => navigate(backToProduct)}
      />
    </div>
  )
}
