import { useState } from 'react'

import { useDeleteProductMutation } from '@/hooks/use-inventory-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Product } from '@/types/inventory'

type ProductDeleteModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

export function ProductDeleteModal({ open, onOpenChange, product }: ProductDeleteModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const mutation = useDeleteProductMutation()

  function handleOpenChange(next: boolean) {
    if (!next) setErrorMessage(null)
    onOpenChange(next)
  }

  async function handleConfirm() {
    if (!product) return
    setErrorMessage(null)
    try {
      await mutation.mutateAsync(product.id)
      handleOpenChange(false)
    } catch {
      setErrorMessage('Tidak dapat menghapus produk. Pastikan tidak ada ketergantungan atau coba lagi.')
    }
  }

  const pending = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-outline-variant bg-card sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Hapus produk?</DialogTitle>
          <DialogDescription>
            Produk <span className="font-semibold">{product?.variant_name ?? '—'}</span> dan{' '}
            <span className="font-semibold">semua kemasan (SKU)</span> yang terhubung akan dihapus
            permanen. Stok dan riwayat terkait dapat terpengaruh.
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
            disabled={pending || !product}
          >
            {pending ? 'Menghapus…' : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
