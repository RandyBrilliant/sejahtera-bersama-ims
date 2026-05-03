import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { ProductForm } from '@/components/admin/inventory/product-form'
import { ProductMetadataAside } from '@/components/admin/inventory/product-metadata-aside'
import { ProductPackagingInlineTable } from '@/components/admin/inventory/product-packaging-inline-table'
import { useProductQuery } from '@/hooks/use-inventory-query'

export function AdminInventoryEditPage() {
  const navigate = useNavigate()
  const { productId: idParam } = useParams<{ productId: string }>()
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
          ← Kembali ke daftar
        </Link>
        <p className="text-destructive text-sm">Produk tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <div>
        <Link
          to="/admin/inventaris"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke daftar
        </Link>
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
          onCancel={() => navigate('/admin/inventaris')}
          onSaved={() => navigate('/admin/inventaris')}
        />
        <ProductMetadataAside product={product} />
      </div>

      <ProductPackagingInlineTable productId={product.id} />
    </div>
  )
}
