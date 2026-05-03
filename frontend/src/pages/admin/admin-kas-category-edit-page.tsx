import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { OperationalCategoryForm } from '@/components/admin/kas/operational-category-form'
import { useOperationalCategoryQuery } from '@/hooks/use-expenses-query'

export function AdminKasCategoryEditPage() {
  const navigate = useNavigate()
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: category, isLoading, isError } = useOperationalCategoryQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to="/admin/kas/kategori" replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat kategori…</p>
  }

  if (isError || !category) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/kas/kategori"
          className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
        >
          ← Kembali ke daftar
        </Link>
        <p className="text-destructive text-sm">Kategori tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/kas/kategori"
        className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
      >
        ← Kembali ke kategori
      </Link>
      <OperationalCategoryForm
        mode="edit"
        initial={category}
        onCancel={() => navigate('/admin/kas/kategori')}
        onSaved={() => navigate('/admin/kas/kategori')}
      />
    </div>
  )
}
