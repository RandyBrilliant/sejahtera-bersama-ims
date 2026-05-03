import { useState } from 'react'

import { useIngredientInventoryQuery, useUpdateIngredientInventoryMutation } from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import { STOCK_UNIT_LABEL } from '@/constants/stock-units'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { parseInventoryMutationError } from '@/components/admin/inventory/inventory-mutation-error'
import type { IngredientInventory } from '@/types/inventory'

type Props = {
  inventoryId: number
  onCancel: () => void
  onSaved: () => void
}

function IngredientInventoryFormFields({
  row,
  inventoryId,
  onCancel,
  onSaved,
}: {
  row: IngredientInventory
  inventoryId: number
  onCancel: () => void
  onSaved: () => void
}) {
  const [remainingStock, setRemainingStock] = useState(() => String(row.remaining_stock))
  const [minimumStock, setMinimumStock] = useState(() => String(row.minimum_stock))
  const mutation = useUpdateIngredientInventoryMutation(inventoryId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!remainingStock.trim() || !minimumStock.trim()) {
      alert.error('Validasi', 'Stok sisa dan stok minimum wajib diisi.')
      return
    }
    try {
      await mutation.mutateAsync({
        remaining_stock: remainingStock.trim(),
        minimum_stock: minimumStock.trim(),
      })
      alert.success('Berhasil', 'Stok bahan diperbarui.')
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parseInventoryMutationError(err))
    }
  }

  const pending = mutation.isPending
  const unitLabel = STOCK_UNIT_LABEL[row.ingredient_unit] ?? row.ingredient_unit

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">{row.ingredient_name}</CardTitle>
          <CardDescription>
            Satuan: {unitLabel}. Penyesuaian stok sisa di sini mengubah nilai tersimpan; riwayat mutasi
            tetap berdiri sendiri. Untuk alur masuk/keluar gunakan halaman mutasi bahan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="inv-remaining">Stok sisa ({unitLabel})</Label>
            <Input
              id="inv-remaining"
              inputMode="decimal"
              value={remainingStock}
              onChange={(e) => setRemainingStock(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inv-min">Stok minimum ({unitLabel})</Label>
            <Input
              id="inv-min"
              inputMode="decimal"
              value={minimumStock}
              onChange={(e) => setMinimumStock(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}

export function IngredientInventoryForm(props: Props) {
  const { data: row, isLoading, isError, error } = useIngredientInventoryQuery(props.inventoryId)

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat data stok…</p>
  }

  if (isError || !row) {
    return (
      <p className="text-destructive text-sm">
        {(error as Error)?.message ?? 'Baris stok tidak ditemukan.'}
      </p>
    )
  }

  return (
    <IngredientInventoryFormFields
      key={row.id}
      row={row}
      inventoryId={props.inventoryId}
      onCancel={props.onCancel}
      onSaved={props.onSaved}
    />
  )
}
