import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { ProductPackagingForm } from '@/components/admin/inventory/product-packaging-form'
import { useProductPackagingQuery } from '@/hooks/use-inventory-query'

export function AdminInventoryPackagingEditPage() {
  const { packagingId: idParam } = useParams<{ packagingId: string }>()
  const navigate = useNavigate()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: packaging, isLoading, isError } = useProductPackagingQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to="/admin/inventaris" replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat kemasan…</p>
  }

  if (isError || !packaging) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/inventaris"
          className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
        >
          ← Kembali
        </Link>
        <p className="text-destructive text-sm">Kemasan tidak ditemukan.</p>
      </div>
    )
  }

  const backToProduct = `/admin/inventaris/${packaging.product}/edit`

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
        onCancel={() => navigate(backToProduct)}
        onSaved={() => navigate(backToProduct)}
      />
    </div>
  )
}
