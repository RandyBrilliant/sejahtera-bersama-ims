import { Link, useNavigate } from 'react-router-dom'

import { IngredientStockMovementForm } from '@/components/admin/inventory/ingredient-stock-movement-form'
import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'

export function AdminIngredientMovementNewPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/gudang/mutasi-bahan"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke mutasi bahan
        </Link>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Catat mutasi bahan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Pilih baris stok bahan, arah mutasi, dan kuantitas. Stok keluar ditolak jika tidak cukup.
        </p>
      </div>

      <WarehouseSubnav />

      <IngredientStockMovementForm
        onCancel={() => navigate('/admin/gudang/mutasi-bahan')}
        onSaved={() => navigate('/admin/gudang/mutasi-bahan')}
      />
    </div>
  )
}
