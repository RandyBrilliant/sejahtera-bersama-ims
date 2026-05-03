import { useState } from 'react'

import {
  useCreateIngredientMutation,
  useUpdateIngredientMutation,
} from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import { STOCK_UNIT_LABEL, STOCK_UNITS } from '@/constants/stock-units'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { parseInventoryMutationError } from '@/components/admin/inventory/inventory-mutation-error'
import type { Ingredient, StockUnit } from '@/types/inventory'

type Props = {
  mode: 'create' | 'edit'
  initial: Ingredient | null
  onCancel: () => void
  onSaved: () => void
}

export function IngredientForm({ mode, initial, onCancel, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [defaultUnit, setDefaultUnit] = useState<StockUnit>(initial?.default_unit ?? 'KG')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  const createMutation = useCreateIngredientMutation()
  const updateMutation = useUpdateIngredientMutation(initial?.id ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      alert.error('Validasi', 'Nama bahan wajib diisi.')
      return
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: name.trim(),
          default_unit: defaultUnit,
          is_active: isActive,
        })
        alert.success('Berhasil', 'Bahan baku ditambahkan.')
      } else {
        if (!initial) return
        await updateMutation.mutateAsync({
          name: name.trim(),
          default_unit: defaultUnit,
          is_active: isActive,
        })
        alert.success('Berhasil', 'Bahan baku diperbarui.')
      }
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parseInventoryMutationError(err))
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">
            {mode === 'create' ? 'Bahan baru' : 'Data bahan'}
          </CardTitle>
          <CardDescription>
            Satu nama bahan per baris (mis. Minyak goreng, Plastik kemasan). Satuan dipakai untuk
            stok & mutasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="ing-name">Nama bahan</Label>
            <Input
              id="ing-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label>Satuan default</Label>
            <Select
              value={defaultUnit}
              onValueChange={(v) => setDefaultUnit(v as StockUnit)}
              disabled={submitting}
            >
              <SelectTrigger className="border-outline-variant w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {STOCK_UNIT_LABEL[u]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="ing-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
              disabled={submitting}
            />
            <Label htmlFor="ing-active" className="font-normal">
              Bahan aktif
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Batal
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
