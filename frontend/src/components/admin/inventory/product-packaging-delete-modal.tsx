import { useState } from 'react'

import { useDeleteProductPackagingMutation } from '@/hooks/use-inventory-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProductPackaging } from '@/types/inventory'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  row: ProductPackaging | null
}

export function ProductPackagingDeleteModal({ open, onOpenChange, row }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const mutation = useDeleteProductPackagingMutation()

  function handleOpenChange(next: boolean) {
    if (!next) setErrorMessage(null)
    onOpenChange(next)
  }

  async function handleConfirm() {
    if (!row) return
    setErrorMessage(null)
    try {
      await mutation.mutateAsync({ id: row.id, productId: row.product })
      handleOpenChange(false)
    } catch {
      setErrorMessage('Tidak dapat menghapus kemasan. Coba lagi.')
    }
  }

  const pending = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-outline-variant bg-card sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Hapus kemasan?</DialogTitle>
          <DialogDescription>
            SKU <span className="font-semibold">{row?.label ?? '—'}</span> (
            {row?.net_mass_grams ?? '—'} g) akan dihapus. Pastikan tidak ada transaksi terbuka yang
            membutuhkan baris ini.
          </DialogDescription>
        </DialogHeader>
        {errorMessage ? (
          <p className="text-destructive text-sm">{errorMessage}</p>
        ) : null}
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button
            type="button"
            variant="default"
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => void handleConfirm()}
            disabled={pending || !row}
          >
            {pending ? 'Menghapus…' : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
