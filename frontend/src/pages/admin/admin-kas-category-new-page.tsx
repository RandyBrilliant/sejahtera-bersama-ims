import { OperationalCategoryForm } from '@/components/admin/kas/operational-category-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/kas/kategori'

export function AdminKasCategoryNewPage() {
  const goBack = useGoBack()

  return (
    <div className="space-y-6">
      <PageBackLink fallback={LIST_PATH} className="mb-0">
        ← Kembali ke kategori
      </PageBackLink>
      <OperationalCategoryForm
        mode="create"
        initial={null}
        onCancel={() => goBack(LIST_PATH)}
        onSaved={() => goBack(LIST_PATH)}
      />
    </div>
  )
}
