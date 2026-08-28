import { useState } from 'react'

import {
  useCreateProductStockMovementMutation,
  useProductPackagingListQuery,
  useProductsQuery,
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
import { PACKAGING_TYPE_LABEL } from '@/constants/packaging-types'
import { formatProductMassKgFromGrams } from '@/lib/format-product-mass'
import type { StockMovementType } from '@/types/inventory'

const PAGE = { page: 1, page_size: 500 } as const
const NO_PROD = '__none__' as const
const NO_PKG = '__none__' as const

function parseQtyField(s: string): number {
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
  const [packagingId, setPackagingId] = useState<number | ''>('')
  const [movementType, setMovementType] = useState<StockMovementType>('IN')
  /** Input dalam kg jika tanpa kemasan; dikirim ke API sebagai gram. */
  const [massKg, setMassKg] = useState('')
  const [bonusKg, setBonusKg] = useState('')
  const [qtyUnits, setQtyUnits] = useState('')
  const [bonusUnits, setBonusUnits] = useState('')
  const [unitCostPerKg, setUnitCostPerKg] = useState('')
  const [note, setNote] = useState('')
  const [movementAtLocal, setMovementAtLocal] = useState(defaultMovementDatetimeLocal)

  const packagingQuery = useProductPackagingListQuery(
    {
      product: productId === '' ? 0 : productId,
      is_active: true,
      page_size: 100,
      ordering: 'net_mass_kg',
    },
    productId !== ''
  )
  const packagingRows = packagingQuery.data?.results ?? []

  const mutation = useCreateProductStockMovementMutation()

  const selectedProduct =
    productId === '' ? undefined : productRows.find((r) => r.id === productId)
  const selectedPackaging =
    packagingId === '' ? undefined : packagingRows.find((r) => r.id === packagingId)

  function handleProductChange(v: string) {
    setProductId(v === NO_PROD ? '' : Number(v))
    setPackagingId('')
    setQtyUnits('')
    setBonusUnits('')
  }

  function handleMovementTypeChange(v: StockMovementType) {
    setMovementType(v)
    if (v === 'OUT') {
      setBonusKg('')
      setBonusUnits('')
    }
  }

  const netKg = selectedPackaging
    ? Number(String(selectedPackaging.net_mass_kg).replace(',', '.'))
    : NaN

  function previewDeltaKg(): number | null {
    if (selectedPackaging) {
      const units = parseQtyField(qtyUnits)
      if (!Number.isFinite(units) || units < 0 || !Number.isFinite(netKg) || netKg <= 0) {
        return null
      }
      if (movementType === 'OUT') return -(units * netKg)
      const bonus = bonusUnits.trim() ? parseQtyField(bonusUnits) : 0
      if (!Number.isFinite(bonus) || bonus < 0) return null
      return (units + bonus) * netKg
    }
    const main = parseQtyField(massKg)
    if (!Number.isFinite(main) || main < 0) return null
    if (movementType === 'OUT') return -main
    const bonus = bonusKg.trim() ? parseQtyField(bonusKg) : 0
    if (!Number.isFinite(bonus) || bonus < 0) return null
    return main + bonus
  }

  function previewDeltaKgDisplay(): string | null {
    const d = previewDeltaKg()
    if (d == null) return null
    if (selectedPackaging && !qtyUnits.trim()) return null
    if (!selectedPackaging && !massKg.trim()) return null
    return d.toLocaleString('id-ID', { maximumFractionDigits: 6 })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (productId === '') {
      alert.error('Validasi', 'Pilih produk (varian).')
      return
    }

    let mainG: number
    let bonusG = 0
    let packaging: number | undefined

    if (packagingId !== '') {
      if (!selectedPackaging || !Number.isFinite(netKg) || netKg <= 0) {
        alert.error('Validasi', 'Kemasan tidak valid.')
        return
      }
      const units = parseQtyField(qtyUnits)
      if (!Number.isFinite(units) || units <= 0) {
        alert.error('Validasi', 'Jumlah kemasan (unit) harus lebih dari nol.')
        return
      }
      const bonusU =
        movementType === 'IN' && bonusUnits.trim() ? parseQtyField(bonusUnits) : 0
      if (
        movementType === 'IN' &&
        bonusUnits.trim() &&
        (!Number.isFinite(bonusU) || bonusU < 0)
      ) {
        alert.error('Validasi', 'Bonus (unit) tidak valid.')
        return
      }
      mainG = units * netKg * 1000
      bonusG = bonusU * netKg * 1000
      packaging = packagingId
    } else {
      const mainKg = parseQtyField(massKg)
      if (!Number.isFinite(mainKg) || mainKg <= 0) {
        alert.error('Validasi', 'Kuantitas (kg) harus lebih dari nol.')
        return
      }
      const bonusKgVal =
        movementType === 'IN' && bonusKg.trim() ? parseQtyField(bonusKg) : 0
      if (
        movementType === 'IN' &&
        bonusKg.trim() &&
        (!Number.isFinite(bonusKgVal) || bonusKgVal < 0)
      ) {
        alert.error('Validasi', 'Bonus (kg) tidak valid.')
        return
      }
      mainG = mainKg * 1000
      bonusG = bonusKgVal * 1000
    }

    if (movementType === 'IN' && !unitCostPerKg.trim()) {
      alert.error('Validasi', 'HPP per kg wajib diisi untuk mutasi masuk.')
      return
    }

    try {
      await mutation.mutateAsync({
        product: productId as number,
        product_packaging: packaging ?? null,
        movement_type: movementType,
        mass_grams: String(mainG),
        bonus_mass_grams:
          movementType === 'IN' && bonusG > 0 ? String(bonusG) : undefined,
        unit_cost_per_kg_idr: movementType === 'IN' ? unitCostPerKg.trim() : undefined,
        note: note.trim().toUpperCase() || undefined,
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
  const useKemasan = packagingId !== ''

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">Mutasi produk jadi</CardTitle>
          <CardDescription>
            Stok yang berubah tetap stok utama (kg). Kemasan opsional: isi jumlah unit SKU
            untuk pembukuan saja, bukan stok terpisah.
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
                onValueChange={handleProductChange}
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
            <Label>Kemasan (opsional, pembukuan)</Label>
            <Select
              value={packagingId === '' ? NO_PKG : String(packagingId)}
              onValueChange={(v) => {
                setPackagingId(v === NO_PKG ? '' : Number(v))
                setQtyUnits('')
                setBonusUnits('')
              }}
              disabled={pending || productId === ''}
            >
              <SelectTrigger className="border-outline-variant w-full min-w-0">
                <SelectValue placeholder="Tanpa SKU — mutasi massa saja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PKG}>Tanpa SKU — mutasi massa saja</SelectItem>
                {packagingRows.map((row) => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.label}
                    {' · '}
                    {PACKAGING_TYPE_LABEL[row.packaging_type] ?? row.packaging_type}
                    {' · '}
                    {Number(String(row.net_mass_kg).replace(',', '.')).toLocaleString('id-ID', {
                      maximumFractionDigits: 6,
                    })}{' '}
                    kg
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-on-surface-variant text-xs">
              Jumlah unit kemasan tercatat di riwayat. Tidak menambah stok kemasan terpisah.
            </p>
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

          {useKemasan ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="prod-mov-units">Jumlah kemasan (unit)</Label>
                <Input
                  id="prod-mov-units"
                  type="number"
                  inputMode="decimal"
                  value={qtyUnits}
                  onChange={(e) => setQtyUnits(e.target.value.replace(/[^0-9.]/g, ''))}
                  disabled={pending}
                  className="border-outline-variant"
                  min="0"
                  step="any"
                  placeholder="0"
                />
              </div>
              {showBonus ? (
                <div className="grid gap-2">
                  <Label htmlFor="prod-mov-bonus-units">
                    Bonus (unit, opsional, hanya masuk)
                  </Label>
                  <Input
                    id="prod-mov-bonus-units"
                    type="number"
                    inputMode="decimal"
                    value={bonusUnits}
                    onChange={(e) => setBonusUnits(e.target.value.replace(/[^0-9.]/g, ''))}
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
            </>
          ) : (
            <>
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
            </>
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
              onChange={(e) => setNote(e.target.value.toUpperCase())}
              disabled={pending}
              rows={3}
              className={cn(
                'border-outline-variant bg-field placeholder:text-muted-foreground min-h-[88px] w-full rounded-lg border px-3 py-2 text-sm uppercase outline-none transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
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
