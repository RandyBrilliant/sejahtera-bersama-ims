import { Link, useNavigate } from 'react-router-dom'

import { IngredientForm } from '@/components/admin/inventory/ingredient-form'
import { WarehouseSubnav } from '@/components/admin/warehouse/warehouse-subnav'

export function AdminIngredientNewPage() {
  const navigate = useNavigate()

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
          Tambah bahan baku
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Nama bahan unik dalam konteks yang Anda kelola. Satuan dipakai konsisten untuk stok &
          mutasi.
        </p>
      </div>

      <WarehouseSubnav />

      <IngredientForm
        mode="create"
        initial={null}
        onCancel={() => navigate('/admin/gudang/bahan-baku')}
        onSaved={() => navigate('/admin/gudang/bahan-baku')}
      />
    </div>
  )
}
