import { useNavigate } from 'react-router-dom'

import { ProductionBatchWizard } from '@/components/admin/inventory/production-batch-wizard'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/gudang/produksi'

export function AdminProductionBatchNewPage() {
  const goBack = useGoBack()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar produksi</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[28px] md:leading-9">
          Catat produksi
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-base leading-relaxed">
          Isi bahan yang dipakai, lalu hasil kemasan. Ikuti langkah satu per satu.
        </p>
      </div>

      <ProductionBatchWizard
        onCancel={() => goBack(LIST_PATH)}
        onSaved={(id) => navigate(`/admin/gudang/produksi/${id}`, { replace: true })}
      />
    </div>
  )
}
