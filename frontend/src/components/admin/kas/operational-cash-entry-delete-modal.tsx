import { useState } from 'react'

import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { useDeleteOperationalCashEntryMutation } from '@/hooks/use-expenses-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { OperationalCashEntry } from '@/types/expenses'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: OperationalCashEntry | null
}

export function OperationalCashEntryDeleteModal({ open, onOpenChange, entry }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const mutation = useDeleteOperationalCashEntryMutation()

  function handleOpenChange(next: boolean) {
    if (!next) setErrorMessage(null)
    onOpenChange(next)
  }

  async function handleConfirm() {
    if (!entry) return
    setErrorMessage(null)
    try {
      await mutation.mutateAsync(entry.id)
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
          <DialogTitle>Hapus transaksi?</DialogTitle>
          <DialogDescription>
            Entri tanggal{' '}
            <span className="font-semibold">{entry?.occurred_on ?? '—'}</span> akan dihapus
            permanen dari jurnal kas operasional.
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
            disabled={pending || !entry}
          >
            {pending ? 'Menghapus…' : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
