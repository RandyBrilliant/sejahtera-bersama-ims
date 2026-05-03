import { Link, useNavigate } from 'react-router-dom'

import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'
import { ProductStockMovementForm } from '@/components/admin/inventory/product-stock-movement-form'

export function AdminProductMovementNewPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/gudang/mutasi-produk"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke mutasi produk
        </Link>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Catat mutasi produk
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Pilih kemasan, arah mutasi, dan kuantitas. Bonus hanya berlaku untuk masuk (IN).
        </p>
      </div>

      <WarehouseSubnav />

      <ProductStockMovementForm
        onCancel={() => navigate('/admin/gudang/mutasi-produk')}
        onSaved={() => navigate('/admin/gudang/mutasi-produk')}
      />
    </div>
  )
}
