import { useState } from 'react'

import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { useDeleteCustomerMutation } from '@/hooks/use-purchase-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Customer } from '@/types/purchase'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
}

export function CustomerDeleteModal({ open, onOpenChange, customer }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const mutation = useDeleteCustomerMutation()

  function handleOpenChange(next: boolean) {
    if (!next) setErrorMessage(null)
    onOpenChange(next)
  }

  async function handleConfirm() {
    if (!customer) return
    setErrorMessage(null)
    try {
      await mutation.mutateAsync(customer.id)
      handleOpenChange(false)
    } catch (err) {
      setErrorMessage(parsePurchaseMutationError(err))
    }
  }

  const pending = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-outline-variant bg-card sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Hapus pelanggan?</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{customer?.name ?? '—'}</span> akan dihapus dari
            master data. Tidak dapat dihapus jika masih dipakai riwayat pesanan — nonaktifkan
            saja lewat edit.
          </DialogDescription>
        </DialogHeader>
        {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="default"
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => void handleConfirm()}
            disabled={pending || !customer}
          >
            {pending ? 'Menghapus…' : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
