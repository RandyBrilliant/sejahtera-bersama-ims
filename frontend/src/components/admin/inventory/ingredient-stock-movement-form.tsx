import { useState } from 'react'

import { useCreateIngredientStockMovementMutation, useIngredientInventoriesQuery } from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import {
  datetimeLocalValueToIso,
  defaultMovementDatetimeLocal,
} from '@/lib/datetime-local'
import { STOCK_UNIT_LABEL } from '@/constants/stock-units'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { parseInventoryMutationError } from '@/components/admin/inventory/inventory-mutation-error'
import type { StockMovementType } from '@/types/inventory'

const listParams = { page: 1, page_size: 500 } as const
const NO_INV = '__none__' as const

type Props = {
  onCancel: () => void
  onSaved: () => void
}

export function IngredientStockMovementForm({ onCancel, onSaved }: Props) {
  const { data: invPage, isLoading } = useIngredientInventoriesQuery(listParams)
  const inventories = invPage?.results ?? []

  const [ingredientInventoryId, setIngredientInventoryId] = useState<number | ''>('')
  const [movementType, setMovementType] = useState<StockMovementType>('IN')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [movementAtLocal, setMovementAtLocal] = useState(defaultMovementDatetimeLocal)

  const mutation = useCreateIngredientStockMovementMutation()

  const selectedRow =
    ingredientInventoryId === ''
      ? undefined
      : inventories.find((r) => r.id === ingredientInventoryId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (ingredientInventoryId === '') {
      alert.error('Validasi', 'Pilih baris stok bahan.')
      return
    }
    if (!quantity.trim()) {
      alert.error('Validasi', 'Kuantitas wajib diisi.')
      return
    }
    try {
      await mutation.mutateAsync({
        ingredient_inventory: ingredientInventoryId as number,
        movement_type: movementType,
        quantity: quantity.trim(),
        note: note.trim() || undefined,
        movement_at: datetimeLocalValueToIso(movementAtLocal),
      })
      alert.success('Berhasil', 'Mutasi bahan dicatat.')
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parseInventoryMutationError(err))
    }
  }

  const pending = mutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">Mutasi bahan</CardTitle>
          <CardDescription>
            Masuk menambah stok sisa; keluar mengurangi dan akan ditolak jika stok tidak cukup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label>Baris stok bahan</Label>
            {isLoading ? (
              <p className="text-on-surface-variant text-sm">Memuat daftar stok…</p>
            ) : (
              <Select
                value={ingredientInventoryId === '' ? NO_INV : String(ingredientInventoryId)}
                onValueChange={(v) =>
                  setIngredientInventoryId(v === NO_INV ? '' : Number(v))
                }
                disabled={pending}
              >
                <SelectTrigger className="border-outline-variant w-full">
                  <SelectValue placeholder="Pilih bahan…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_INV}>— Pilih —</SelectItem>
                  {inventories.map((row) => (
                    <SelectItem key={row.id} value={String(row.id)}>
                      {row.ingredient_name} (
                      {STOCK_UNIT_LABEL[row.ingredient_unit] ?? row.ingredient_unit}) — sisa{' '}
                      {row.remaining_stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedRow ? (
              <p className="text-on-surface-variant text-xs">
                Dipilih: {selectedRow.ingredient_name} (
                {STOCK_UNIT_LABEL[selectedRow.ingredient_unit] ?? selectedRow.ingredient_unit})
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>Jenis</Label>
            <Select
              value={movementType}
              onValueChange={(v) => setMovementType(v as StockMovementType)}
              disabled={pending}
            >
              <SelectTrigger className="border-outline-variant w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN">Masuk (IN)</SelectItem>
                <SelectItem value="OUT">Keluar (OUT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ing-mov-qty">Kuantitas</Label>
            <Input
              id="ing-mov-qty"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ing-mov-at">Waktu mutasi</Label>
            <Input
              id="ing-mov-at"
              type="datetime-local"
              value={movementAtLocal}
              onChange={(e) => setMovementAtLocal(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ing-mov-note">Catatan (opsional)</Label>
            <textarea
              id="ing-mov-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={pending}
              rows={3}
              className={cn(
                'border-outline-variant bg-background placeholder:text-muted-foreground min-h-[88px] w-full rounded-lg border px-3 py-2 text-sm outline-none transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]'
              )}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending || isLoading}>
          {pending ? 'Menyimpan…' : 'Simpan mutasi'}
        </Button>
      </div>
    </form>
  )
}
