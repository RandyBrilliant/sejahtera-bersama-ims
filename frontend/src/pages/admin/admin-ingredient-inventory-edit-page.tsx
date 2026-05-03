import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { IngredientInventoryForm } from '@/components/admin/inventory/ingredient-inventory-form'
import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'

export function AdminIngredientInventoryEditPage() {
  const navigate = useNavigate()
  const { inventoryId: idParam } = useParams<{ inventoryId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  if (!validId) {
    return <Navigate to="/admin/gudang/stok-bahan" replace />
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/gudang/stok-bahan"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke stok bahan
        </Link>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Edit stok bahan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Sesuaikan stok sisa atau minimum. Untuk penyesuaian bercatatan gunakan mutasi bahan.
        </p>
      </div>

      <WarehouseSubnav />

      <IngredientInventoryForm
        inventoryId={id}
        onCancel={() => navigate('/admin/gudang/stok-bahan')}
        onSaved={() => navigate('/admin/gudang/stok-bahan')}
      />
    </div>
  )
}
