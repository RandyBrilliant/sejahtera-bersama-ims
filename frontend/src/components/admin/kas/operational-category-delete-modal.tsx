import { useState } from 'react'

import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { useDeleteOperationalCategoryMutation } from '@/hooks/use-expenses-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { OperationalCategory } from '@/types/expenses'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: OperationalCategory | null
}

export function OperationalCategoryDeleteModal({ open, onOpenChange, category }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const mutation = useDeleteOperationalCategoryMutation()

  function handleOpenChange(next: boolean) {
    if (!next) setErrorMessage(null)
    onOpenChange(next)
  }

  async function handleConfirm() {
    if (!category) return
    setErrorMessage(null)
    try {
      await mutation.mutateAsync(category.id)
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
          <DialogTitle>Hapus kategori?</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{category?.name ?? '—'}</span> tidak dapat dihapus
            jika masih dipakai transaksi kas.
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
            disabled={pending || !category}
          >
            {pending ? 'Menghapus…' : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
