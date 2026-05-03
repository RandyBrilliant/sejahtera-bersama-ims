import { Link, useNavigate } from 'react-router-dom'

import { OperationalCategoryForm } from '@/components/admin/kas/operational-category-form'

export function AdminKasCategoryNewPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <Link
        to="/admin/kas/kategori"
        className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
      >
        ← Kembali ke kategori
      </Link>
      <OperationalCategoryForm
        mode="create"
        initial={null}
        onCancel={() => navigate('/admin/kas/kategori')}
        onSaved={() => navigate('/admin/kas/kategori')}
      />
    </div>
  )
}
