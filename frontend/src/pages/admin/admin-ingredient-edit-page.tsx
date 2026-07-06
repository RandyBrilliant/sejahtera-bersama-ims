import { Navigate, useParams } from 'react-router-dom'

import { IngredientForm } from '@/components/admin/inventory/ingredient-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useIngredientQuery } from '@/hooks/use-inventory-query'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/gudang/bahan-baku'

export function AdminIngredientEditPage() {
  const goBack = useGoBack()
  const { ingredientId: idParam } = useParams<{ ingredientId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: ingredient, isLoading, isError } = useIngredientQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat bahan…</p>
  }

  if (isError || !ingredient) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={LIST_PATH} className="mb-0">
          ← Kembali ke daftar
        </PageBackLink>
        <p className="text-destructive text-sm">Bahan tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar bahan</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Edit bahan baku
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Ubah nama, satuan default, atau status aktif. Stok tersimpan terpisah di menu stok bahan.
        </p>
      </div>

      <IngredientForm
        mode="edit"
        initial={ingredient}
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
