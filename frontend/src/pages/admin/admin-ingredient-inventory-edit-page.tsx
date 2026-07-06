import { Navigate, useParams } from 'react-router-dom'

import { IngredientInventoryForm } from '@/components/admin/inventory/ingredient-inventory-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/gudang/stok-bahan'

export function AdminIngredientInventoryEditPage() {
  const goBack = useGoBack()
  const { inventoryId: idParam } = useParams<{ inventoryId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke stok bahan</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Edit stok bahan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Sesuaikan stok sisa atau minimum. Untuk penyesuaian bercatatan gunakan mutasi bahan.
        </p>
      </div>

      <IngredientInventoryForm
        inventoryId={id}
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
