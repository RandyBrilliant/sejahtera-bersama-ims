import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'

import { CustomerDeleteModal } from '@/components/admin/customers/customer-delete-modal'
import { CustomerForm } from '@/components/admin/customers/customer-form'
import { CustomerMetadataAside } from '@/components/admin/customers/customer-metadata-aside'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { useCustomerQuery } from '@/hooks/use-purchase-query'
import { useAuth } from '@/hooks/use-auth'
import { useGoBack } from '@/hooks/use-go-back'
import { Button } from '@/components/ui/button'

const LIST_PATH = '/admin/pelanggan'

export function AdminCustomerEditPage() {
  const goBack = useGoBack()
  const { user } = useAuth()
  const { id: idParam } = useParams<{ id: string }>()
  const [isDeleteOpen, setDeleteOpen] = useState(false)
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0
  const canDelete = user?.role === 'ADMIN' || user?.role === 'LEADERSHIP'

  const { data: customer, isLoading, isError } = useCustomerQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat pelanggan…</p>
  }

  if (isError || !customer) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={LIST_PATH} className="mb-0">
          ← Kembali ke daftar
        </PageBackLink>
        <p className="text-destructive text-sm">Pelanggan tidak ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar pelanggan</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Edit pelanggan
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Perbarui kontak atau status aktif. Pelanggan nonaktif disembunyikan dari dropdown pesanan
          baru.
        </p>
        {canDelete ? (
          <Button
            type="button"
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/5 mt-4 gap-2"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Hapus pelanggan
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <CustomerForm
          mode="edit"
          initial={customer}
          onCancel={() => goBack(LIST_PATH)}
          onSaved={() => goBack(LIST_PATH)}
        />
        <CustomerMetadataAside customer={customer} />
      </div>

      {canDelete ? (
        <CustomerDeleteModal
          open={isDeleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={() => goBack(LIST_PATH)}
          customer={customer}
        />
      ) : null}
    </div>
  )
}
