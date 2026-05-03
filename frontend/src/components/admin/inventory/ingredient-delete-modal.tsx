import { useState } from 'react'

import { useDeleteIngredientMutation } from '@/hooks/use-inventory-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Ingredient } from '@/types/inventory'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  ingredient: Ingredient | null
}

export function IngredientDeleteModal({ open, onOpenChange, ingredient }: Props) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const mutation = useDeleteIngredientMutation()

  function handleOpenChange(next: boolean) {
    if (!next) setErrorMessage(null)
    onOpenChange(next)
  }

  async function handleConfirm() {
    if (!ingredient) return
    setErrorMessage(null)
    try {
      await mutation.mutateAsync(ingredient.id)
      handleOpenChange(false)
    } catch {
      setErrorMessage(
        'Tidak dapat menghapus bahan. Pastikan tidak ada mutasi atau produksi yang bergantung pada data ini.'
      )
    }
  }

  const pending = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-outline-variant bg-card sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Hapus bahan baku?</DialogTitle>
          <DialogDescription>
            <span className="font-semibold">{ingredient?.name ?? '—'}</span> beserta catatan stok
            terkait dapat gagal dihapus jika ada riwayat mutasi yang melindungi data.
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
            disabled={pending || !ingredient}
          >
            {pending ? 'Menghapus…' : 'Hapus'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
