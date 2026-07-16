import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { parseInventoryMutationError } from '@/components/admin/inventory/inventory-mutation-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STOCK_UNIT_LABEL } from '@/constants/stock-units'
import {
  useCreateProductionBatchMutation,
  useIngredientInventoriesQuery,
  useProductPackagingListQuery,
} from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import { cn } from '@/lib/utils'

const listParams = { page: 1, page_size: 500, is_active: true } as const
const NO_VAL = '__none__' as const

type IngredientLine = {
  key: string
  ingredient_inventory: number | ''
  quantity_used: string
}

type PackagingLine = {
  key: string
  product_packaging: number | ''
  quantity_produced: string
  bonus_quantity: string
}

function newKey() {
  return crypto.randomUUID()
}

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtQty(raw: string | number) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return String(raw)
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

type Props = {
  onCancel: () => void
  onSaved: (batchId: number) => void
}

export function ProductionBatchForm({ onCancel, onSaved }: Props) {
  const { data: invPage, isLoading: invLoading } = useIngredientInventoriesQuery(listParams)
  const { data: pkgPage, isLoading: pkgLoading } = useProductPackagingListQuery(listParams)
  const inventories = invPage?.results ?? []
  const packagings = pkgPage?.results ?? []

  const [productionDate, setProductionDate] = useState(todayIso)
  const [shiftLabel, setShiftLabel] = useState('')
  const [note, setNote] = useState('')
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>([
    { key: newKey(), ingredient_inventory: '', quantity_used: '' },
  ])
  const [packagingLines, setPackagingLines] = useState<PackagingLine[]>([
    { key: newKey(), product_packaging: '', quantity_produced: '', bonus_quantity: '0' },
  ])

  const mutation = useCreateProductionBatchMutation()
  const pending = mutation.isPending
  const loading = invLoading || pkgLoading

  function updateIngredient(key: string, patch: Partial<IngredientLine>) {
    setIngredientLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function updatePackaging(key: string, patch: Partial<PackagingLine>) {
    setPackagingLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!productionDate) {
      alert.error('Validasi', 'Tanggal produksi wajib diisi.')
      return
    }

    const usages = ingredientLines
      .filter((l) => l.ingredient_inventory !== '' && l.quantity_used.trim())
      .map((l) => ({
        ingredient_inventory: l.ingredient_inventory as number,
        quantity_used: l.quantity_used.trim(),
      }))
    const outputs = packagingLines
      .filter((l) => l.product_packaging !== '' && l.quantity_produced.trim())
      .map((l) => ({
        product_packaging: l.product_packaging as number,
        quantity_produced: l.quantity_produced.trim(),
        bonus_quantity: l.bonus_quantity.trim() || '0',
      }))

    if (usages.length === 0) {
      alert.error('Validasi', 'Minimal satu pemakaian bahan.')
      return
    }
    if (outputs.length === 0) {
      alert.error('Validasi', 'Minimal satu output kemasan.')
      return
    }

    const ingIds = usages.map((u) => u.ingredient_inventory)
    if (new Set(ingIds).size !== ingIds.length) {
      alert.error('Validasi', 'Bahan tidak boleh duplikat dalam satu batch.')
      return
    }
    const pkgIds = outputs.map((o) => o.product_packaging)
    if (new Set(pkgIds).size !== pkgIds.length) {
      alert.error('Validasi', 'Kemasan tidak boleh duplikat dalam satu batch.')
      return
    }

    try {
      const batch = await mutation.mutateAsync({
        production_date: productionDate,
        shift_label: shiftLabel.trim() || undefined,
        note: note.trim() || undefined,
        ingredient_usages_input: usages,
        packaging_outputs_input: outputs,
      })
      alert.success('Berhasil', 'Batch produksi dicatat. Stok bahan & produk diperbarui.')
      onSaved(batch.id)
    } catch (err) {
      alert.error('Gagal menyimpan', parseInventoryMutationError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">Info batch</CardTitle>
          <CardDescription>
            Batch bersifat tetap setelah disimpan — stok bahan dipotong dan stok produk ditambah.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>Tanggal produksi</Label>
            <DatePickerInput
              value={productionDate}
              onChange={setProductionDate}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="batch-shift">Shift (opsional)</Label>
            <Input
              id="batch-shift"
              value={shiftLabel}
              onChange={(e) => setShiftLabel(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
              placeholder="Contoh: Shift pagi"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="batch-note">Catatan (opsional)</Label>
            <textarea
              id="batch-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={pending}
              rows={2}
              className={cn(
                'border-outline-variant bg-field placeholder:text-muted-foreground min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm outline-none',
                'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]',
                'disabled:pointer-events-none disabled:opacity-50'
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-base">Pemakaian bahan</CardTitle>
            <CardDescription>Kurangi stok bahan baku untuk batch ini.</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={pending}
            onClick={() =>
              setIngredientLines((rows) => [
                ...rows,
                { key: newKey(), ingredient_inventory: '', quantity_used: '' },
              ])
            }
          >
            <Plus className="size-4" /> Baris
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          {ingredientLines.map((line) => {
            const selected =
              line.ingredient_inventory === ''
                ? undefined
                : inventories.find((r) => r.id === line.ingredient_inventory)
            return (
              <div
                key={line.key}
                className="border-outline-variant grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_140px_auto]"
              >
                <div className="grid gap-1">
                  <Label className="text-xs">Bahan</Label>
                  <Select
                    value={
                      line.ingredient_inventory === ''
                        ? NO_VAL
                        : String(line.ingredient_inventory)
                    }
                    onValueChange={(v) =>
                      updateIngredient(line.key, {
                        ingredient_inventory: v === NO_VAL ? '' : Number(v),
                      })
                    }
                    disabled={pending || loading}
                  >
                    <SelectTrigger className="border-outline-variant w-full">
                      <SelectValue placeholder="Pilih bahan…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_VAL}>— Pilih —</SelectItem>
                      {inventories.map((row) => (
                        <SelectItem key={row.id} value={String(row.id)}>
                          {row.ingredient_name} — sisa {fmtQty(row.remaining_stock)}{' '}
                          {STOCK_UNIT_LABEL[row.ingredient_unit] ?? row.ingredient_unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selected ? (
                    <p className="text-on-surface-variant text-xs">
                      Sisa: {fmtQty(selected.remaining_stock)}{' '}
                      {STOCK_UNIT_LABEL[selected.ingredient_unit] ?? selected.ingredient_unit}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Qty dipakai</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    value={line.quantity_used}
                    onChange={(e) =>
                      updateIngredient(line.key, {
                        quantity_used: e.target.value.replace(/[^0-9.]/g, ''),
                      })
                    }
                    disabled={pending}
                    className="border-outline-variant"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive size-9 px-0"
                    disabled={pending || ingredientLines.length <= 1}
                    onClick={() =>
                      setIngredientLines((rows) => rows.filter((r) => r.key !== line.key))
                    }
                    aria-label="Hapus baris bahan"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-base">Hasil kemasan</CardTitle>
            <CardDescription>Tambah stok produk (utama + bonus).</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={pending}
            onClick={() =>
              setPackagingLines((rows) => [
                ...rows,
                {
                  key: newKey(),
                  product_packaging: '',
                  quantity_produced: '',
                  bonus_quantity: '0',
                },
              ])
            }
          >
            <Plus className="size-4" /> Baris
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          {packagingLines.map((line) => (
            <div
              key={line.key}
              className="border-outline-variant grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_120px_120px_auto]"
            >
              <div className="grid gap-1">
                <Label className="text-xs">Kemasan</Label>
                <Select
                  value={
                    line.product_packaging === '' ? NO_VAL : String(line.product_packaging)
                  }
                  onValueChange={(v) =>
                    updatePackaging(line.key, {
                      product_packaging: v === NO_VAL ? '' : Number(v),
                    })
                  }
                  disabled={pending || loading}
                >
                  <SelectTrigger className="border-outline-variant w-full">
                    <SelectValue placeholder="Pilih kemasan…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_VAL}>— Pilih —</SelectItem>
                    {packagings.map((row) => (
                      <SelectItem key={row.id} value={String(row.id)}>
                        {row.product_variant_name} · {row.label} ({row.net_mass_kg} kg)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Qty utama</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={line.quantity_produced}
                  onChange={(e) =>
                    updatePackaging(line.key, {
                      quantity_produced: e.target.value.replace(/[^0-9.]/g, ''),
                    })
                  }
                  disabled={pending}
                  className="border-outline-variant"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Bonus</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={line.bonus_quantity}
                  onChange={(e) =>
                    updatePackaging(line.key, {
                      bonus_quantity: e.target.value.replace(/[^0-9.]/g, ''),
                    })
                  }
                  disabled={pending}
                  className="border-outline-variant"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive size-9 px-0"
                  disabled={pending || packagingLines.length <= 1}
                  onClick={() =>
                    setPackagingLines((rows) => rows.filter((r) => r.key !== line.key))
                  }
                  aria-label="Hapus baris kemasan"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending || loading}>
          {pending ? 'Menyimpan…' : 'Simpan batch'}
        </Button>
      </div>
    </form>
  )
}
