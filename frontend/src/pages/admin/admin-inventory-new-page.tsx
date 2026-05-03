import { Link, useNavigate } from 'react-router-dom'

import { ProductForm } from '@/components/admin/inventory/product-form'

export function AdminInventoryNewPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/inventaris"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke daftar
        </Link>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Tambah produk
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Setelah produk disimpan, tambahkan ukuran kemasan di halaman edit.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start lg:gap-10">
        <ProductForm
          key="create"
          mode="create"
          initialProduct={null}
          onCancel={() => navigate('/admin/inventaris')}
          onSaved={() => navigate('/admin/inventaris')}
        />
        <aside className="border-outline-variant bg-surface-container-lowest ambient-shadow lg:sticky lg:top-20 rounded-xl border p-6">
          <h2 className="text-on-surface mb-3 text-sm font-semibold tracking-wide uppercase">
            Informasi
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Kombinasi <span className="text-on-surface font-medium">nama + varian</span> harus
            unik. Metadata audit muncul di samping setelah produk tersimpan (halaman edit).
          </p>
        </aside>
      </div>
    </div>
  )
}
