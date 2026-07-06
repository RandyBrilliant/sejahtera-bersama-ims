import { Navigate, useParams } from 'react-router-dom'

import { OperationalCategoryForm } from '@/components/admin/kas/operational-category-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useOperationalCategoryQuery } from '@/hooks/use-expenses-query'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/kas/kategori'

export function AdminKasCategoryEditPage() {
  const goBack = useGoBack()
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: category, isLoading, isError } = useOperationalCategoryQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat kategori…</p>
  }

  if (isError || !category) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={LIST_PATH} className="mb-0">
          ← Kembali ke daftar
        </PageBackLink>
        <p className="text-destructive text-sm">Kategori tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBackLink fallback={LIST_PATH} className="mb-0">
        ← Kembali ke kategori
      </PageBackLink>
      <OperationalCategoryForm
        mode="edit"
        initial={category}
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
