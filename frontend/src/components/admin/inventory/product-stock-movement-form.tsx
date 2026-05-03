import { useState } from 'react'

import {
  useCreateProductStockMovementMutation,
  useProductPackagingListQuery,
} from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import {
  datetimeLocalValueToIso,
  defaultMovementDatetimeLocal,
} from '@/lib/datetime-local'
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
const NO_PKG = '__none__' as const

type Props = {
  onCancel: () => void
  onSaved: () => void
}

export function ProductStockMovementForm({ onCancel, onSaved }: Props) {
  const { data: pkgPage, isLoading } = useProductPackagingListQuery(listParams)
  const packagingRows = pkgPage?.results ?? []

  const [productPackagingId, setProductPackagingId] = useState<number | ''>('')
  const [movementType, setMovementType] = useState<StockMovementType>('IN')
  const [quantity, setQuantity] = useState('')
  const [bonusQuantity, setBonusQuantity] = useState('')
  const [note, setNote] = useState('')
  const [movementAtLocal, setMovementAtLocal] = useState(defaultMovementDatetimeLocal)

  const mutation = useCreateProductStockMovementMutation()

  const selectedPkg =
    productPackagingId === '' ? undefined : packagingRows.find((r) => r.id === productPackagingId)

  function handleMovementTypeChange(v: StockMovementType) {
    setMovementType(v)
    if (v === 'OUT') setBonusQuantity('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (productPackagingId === '') {
      alert.error('Validasi', 'Pilih kemasan (SKU).')
      return
    }
    if (!quantity.trim()) {
      alert.error('Validasi', 'Kuantitas utama wajib diisi.')
      return
    }
    const bonusRaw = bonusQuantity.trim()
    if (movementType === 'IN' && bonusRaw && Number(bonusRaw) < 0) {
      alert.error('Validasi', 'Bonus tidak boleh negatif.')
      return
    }
    try {
      await mutation.mutateAsync({
        product_packaging: productPackagingId as number,
        movement_type: movementType,
        quantity: quantity.trim(),
        bonus_quantity: movementType === 'IN' ? bonusRaw || '0' : '0',
        note: note.trim() || undefined,
        movement_at: datetimeLocalValueToIso(movementAtLocal),
      })
      alert.success('Berhasil', 'Mutasi produk dicatat.')
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parseInventoryMutationError(err))
    }
  }

  const pending = mutation.isPending
  const showBonus = movementType === 'IN'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">Mutasi kemasan (SKU)</CardTitle>
          <CardDescription>
            Masuk: kuantitas utama plus opsi bonus (hanya untuk IN). Keluar: mengurangi stok sesuai
            kuantitas utama; bonus harus nol.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label>Kemasan</Label>
            {isLoading ? (
              <p className="text-on-surface-variant text-sm">Memuat daftar kemasan…</p>
            ) : (
              <Select
                value={productPackagingId === '' ? NO_PKG : String(productPackagingId)}
                onValueChange={(v) => setProductPackagingId(v === NO_PKG ? '' : Number(v))}
                disabled={pending}
              >
                <SelectTrigger className="border-outline-variant w-full min-w-0">
                  <SelectValue placeholder="Pilih SKU…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PKG}>— Pilih —</SelectItem>
                  {packagingRows.map((row) => (
                    <SelectItem key={row.id} value={String(row.id)}>
                      {row.product_variant_name} · {row.label} · {row.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedPkg ? (
              <p className="text-on-surface-variant text-xs break-words">
                Dipilih: {selectedPkg.product_variant_name} — {selectedPkg.label} ({selectedPkg.sku})
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>Jenis</Label>
            <Select
              value={movementType}
              onValueChange={(v) => handleMovementTypeChange(v as StockMovementType)}
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
            <Label htmlFor="prod-mov-qty">Kuantitas utama (kemasan)</Label>
            <Input
              id="prod-mov-qty"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>

          {showBonus ? (
            <div className="grid gap-2">
              <Label htmlFor="prod-mov-bonus">Bonus (opsional, hanya masuk)</Label>
              <Input
                id="prod-mov-bonus"
                inputMode="decimal"
                value={bonusQuantity}
                onChange={(e) => setBonusQuantity(e.target.value)}
                disabled={pending}
                placeholder="0"
                className="border-outline-variant"
              />
            </div>
          ) : (
            <p className="text-on-surface-variant text-xs">
              Keluar tidak menggunakan bonus; server menolak bonus &gt; 0 untuk OUT.
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="prod-mov-at">Waktu mutasi</Label>
            <Input
              id="prod-mov-at"
              type="datetime-local"
              value={movementAtLocal}
              onChange={(e) => setMovementAtLocal(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prod-mov-note">Catatan (opsional)</Label>
            <textarea
              id="prod-mov-note"
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
