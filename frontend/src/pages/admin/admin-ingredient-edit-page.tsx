import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { IngredientForm } from '@/components/admin/inventory/ingredient-form'
import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'
import { useIngredientQuery } from '@/hooks/use-inventory-query'

export function AdminIngredientEditPage() {
  const navigate = useNavigate()
  const { ingredientId: idParam } = useParams<{ ingredientId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: ingredient, isLoading, isError } = useIngredientQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to="/admin/gudang/bahan-baku" replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat bahan…</p>
  }

  if (isError || !ingredient) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/gudang/bahan-baku"
          className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
        >
          ← Kembali ke daftar
        </Link>
        <p className="text-destructive text-sm">Bahan tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/gudang/bahan-baku"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke daftar bahan
        </Link>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Edit bahan baku
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Ubah nama, satuan default, atau status aktif. Stok tersimpan terpisah di menu stok bahan.
        </p>
      </div>

      <WarehouseSubnav />

      <IngredientForm
        mode="edit"
        initial={ingredient}
        onCancel={() => navigate('/admin/gudang/bahan-baku')}
        onSaved={() => navigate('/admin/gudang/bahan-baku')}
      />
    </div>
  )
}
