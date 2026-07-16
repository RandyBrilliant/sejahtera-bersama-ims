import { useNavigate } from 'react-router-dom'

import { ProductionBatchForm } from '@/components/admin/inventory/production-batch-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/gudang/produksi'

export function AdminProductionBatchNewPage() {
  const goBack = useGoBack()
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar produksi</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Catat batch produksi
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Isi pemakaian bahan dan hasil kemasan. Stok akan dipotong / ditambah saat disimpan.
        </p>
      </div>

      <ProductionBatchForm
        onCancel={() => goBack(LIST_PATH)}
        onSaved={(id) => navigate(`/admin/gudang/produksi/${id}`, { replace: true })}
      />
    </div>
  )
}
