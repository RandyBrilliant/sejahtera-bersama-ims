import { useState } from 'react'

import { useCreateProductStockMovementMutation, useProductsQuery } from '@/hooks/use-inventory-query'
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
import { formatProductMassKgFromGrams } from '@/lib/format-product-mass'
import type { StockMovementType } from '@/types/inventory'

const PAGE = { page: 1, page_size: 500 } as const
const NO_PROD = '__none__' as const

function parseKgField(s: string): number {
  return Number(String(s).trim().replace(/\s/g, '').replace(',', '.'))
}

type Props = {
  onCancel: () => void
  onSaved: () => void
}

export function ProductStockMovementForm({ onCancel, onSaved }: Props) {
  const { data: productPage, isLoading: productsLoading } = useProductsQuery({
    ...PAGE,
    is_active: true,
    ordering: 'variant_name',
  })
  const productRows = productPage?.results ?? []

  const [productId, setProductId] = useState<number | ''>('')
  const [movementType, setMovementType] = useState<StockMovementType>('IN')
  /** Input dalam kg; dikirim ke API sebagai gram. */
  const [massKg, setMassKg] = useState('')
  const [bonusKg, setBonusKg] = useState('')
  const [unitCostPerKg, setUnitCostPerKg] = useState('')
  const [note, setNote] = useState('')
  const [movementAtLocal, setMovementAtLocal] = useState(defaultMovementDatetimeLocal)

  const mutation = useCreateProductStockMovementMutation()

  const selectedProduct =
    productId === '' ? undefined : productRows.find((r) => r.id === productId)

  function handleMovementTypeChange(v: StockMovementType) {
    setMovementType(v)
    if (v === 'OUT') setBonusKg('')
  }

  /** Perkiraan Δ stok utama dalam kg (bertanda: keluar negatif). */
  function previewDeltaKg(): number | null {
    const main = parseKgField(massKg)
    if (!Number.isFinite(main) || main < 0) return null
    if (movementType === 'OUT') {
      return -main
    }
    const bonus = bonusKg.trim() ? parseKgField(bonusKg) : 0
    if (!Number.isFinite(bonus) || bonus < 0) return null
    return main + bonus
  }

  function previewDeltaKgDisplay(): string | null {
    const d = previewDeltaKg()
    if (d == null || massKg.trim() === '') return null
    return d.toLocaleString('id-ID', { maximumFractionDigits: 6 })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (productId === '') {
      alert.error('Validasi', 'Pilih produk (varian).')
      return
    }

    const mainKg = parseKgField(massKg)
    if (!Number.isFinite(mainKg) || mainKg <= 0) {
      alert.error('Validasi', 'Kuantitas (kg) harus lebih dari nol.')
      return
    }

    const bonusKgVal =
      movementType === 'IN' && bonusKg.trim() ? parseKgField(bonusKg) : 0
    if (movementType === 'IN' && bonusKg.trim() && (!Number.isFinite(bonusKgVal) || bonusKgVal < 0)) {
      alert.error('Validasi', 'Bonus (kg) tidak valid.')
      return
    }

    const mainG = mainKg * 1000
    const bonusG = bonusKgVal * 1000

    if (movementType === 'IN' && !unitCostPerKg.trim()) {
      alert.error('Validasi', 'HPP per kg wajib diisi untuk mutasi masuk.')
      return
    }

    try {
      await mutation.mutateAsync({
        product: productId as number,
        movement_type: movementType,
        mass_grams: String(mainG),
        bonus_mass_grams:
          movementType === 'IN' && bonusG > 0 ? String(bonusG) : undefined,
        unit_cost_per_kg_idr: movementType === 'IN' ? unitCostPerKg.trim() : undefined,
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
  const previewKg = previewDeltaKgDisplay()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">Mutasi produk jadi</CardTitle>
          <CardDescription>
            Pilih varian produk. Isi kuantitas mutasi dalam kilogram (kg); tidak perlu memilih kemasan.
            Bonus kg hanya untuk masuk (IN).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label>Produk (varian)</Label>
            {productsLoading ? (
              <p className="text-on-surface-variant text-sm">Memuat produk…</p>
            ) : (
              <Select
                value={productId === '' ? NO_PROD : String(productId)}
                onValueChange={(v) => setProductId(v === NO_PROD ? '' : Number(v))}
                disabled={pending}
              >
                <SelectTrigger className="border-outline-variant w-full min-w-0">
                  <SelectValue placeholder="Pilih varian…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROD}>— Pilih —</SelectItem>
                  {productRows.map((row) => (
                    <SelectItem key={row.id} value={String(row.id)}>
                      {row.variant_name}
                      {' · Stok utama '}
                      {formatProductMassKgFromGrams(row.remaining_mass_grams)} kg
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedProduct ? (
              <p className="text-on-surface-variant text-xs break-words">
                Stok utama varian ini:{' '}
                <span className="text-on-surface tabular-nums font-medium">
                  {formatProductMassKgFromGrams(selectedProduct.remaining_mass_grams)} kg
                </span>
              </p>
            ) : null}
            {previewKg != null ? (
              <p className="text-on-surface-variant text-xs">
                Dampak ke stok utama (perkiraan):{' '}
                <span className="text-on-surface font-medium tabular-nums">{previewKg} kg</span>
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
            <Label htmlFor="prod-mov-qty">Kuantitas (kg)</Label>
            <Input
              id="prod-mov-qty"
              type="number"
              inputMode="decimal"
              value={massKg}
              onChange={(e) => setMassKg(e.target.value.replace(/[^0-9.]/g, ''))}
              disabled={pending}
              className="border-outline-variant"
              min="0"
              step="any"
              placeholder="0"
            />
          </div>

          {showBonus ? (
            <div className="grid gap-2">
              <Label htmlFor="prod-mov-bonus">Bonus (kg, opsional, hanya masuk)</Label>
              <Input
                id="prod-mov-bonus"
                type="number"
                inputMode="decimal"
                value={bonusKg}
                onChange={(e) => setBonusKg(e.target.value.replace(/[^0-9.]/g, ''))}
                disabled={pending}
                placeholder="0"
                className="border-outline-variant"
                min="0"
                step="any"
              />
            </div>
          ) : (
            <p className="text-on-surface-variant text-xs">
              Keluar tidak menggunakan bonus; server menolak bonus &gt; 0 untuk OUT.
            </p>
          )}

          {movementType === 'IN' ? (
            <div className="grid gap-2">
              <Label htmlFor="prod-mov-cost">HPP per kg (IDR)</Label>
              <Input
                id="prod-mov-cost"
                type="number"
                inputMode="decimal"
                value={unitCostPerKg}
                onChange={(e) => setUnitCostPerKg(e.target.value.replace(/[^0-9.]/g, ''))}
                disabled={pending}
                className="border-outline-variant"
                min="0"
                step="any"
                placeholder="0"
              />
              <p className="text-on-surface-variant text-xs">
                Digunakan untuk memperbarui biaya rata-rata produk jadi.
              </p>
            </div>
          ) : null}

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
                'border-outline-variant bg-field placeholder:text-muted-foreground min-h-[88px] w-full rounded-lg border px-3 py-2 text-sm outline-none transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
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
        <Button type="submit" disabled={pending || productsLoading}>
          {pending ? 'Menyimpan…' : 'Simpan mutasi'}
        </Button>
      </div>
    </form>
  )
}
