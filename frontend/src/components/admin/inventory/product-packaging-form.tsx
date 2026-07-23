import { useState } from 'react'

import {
  useCreateProductPackagingMutation,
  useUpdateProductPackagingMutation,
} from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import { PACKAGING_TYPE_LABEL, PACKAGING_TYPES } from '@/constants/packaging-types'
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
import type { PackagingType, ProductPackaging } from '@/types/inventory'

type Props = {
  mode: 'create' | 'edit'
  productId: number
  initial: ProductPackaging | null
  onCancel: () => void
  onSaved: () => void
}

export function ProductPackagingForm({ mode, productId, initial, onCancel, onSaved }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [packagingType, setPackagingType] = useState<PackagingType>(
    initial?.packaging_type ?? 'BAL'
  )
  const [netMassKg, setNetMassKg] = useState(
    initial ? String(initial.net_mass_kg) : ''
  )
  const [sku, setSku] = useState(initial?.sku ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  const createMutation = useCreateProductPackagingMutation()
  const updateMutation = useUpdateProductPackagingMutation(initial?.id ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) {
      alert.error('Validasi', 'Label kemasan wajib diisi.')
      return
    }
    const kgRaw = netMassKg.trim().replace(',', '.')
    const kg = Number(kgRaw)
    if (!Number.isFinite(kg) || kg < 0.000001) {
      alert.error('Validasi', 'Berat bersih (kg) harus lebih dari nol.')
      return
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          product: productId,
          label: label.trim(),
          packaging_type: packagingType,
          net_mass_kg: kgRaw,
          sku: sku.trim() || '',
          is_active: isActive,
        })
        alert.success('Berhasil', 'Kemasan ditambahkan.')
      } else {
        if (!initial) return
        await updateMutation.mutateAsync({
          label: label.trim(),
          packaging_type: packagingType,
          net_mass_kg: kgRaw,
          sku: sku.trim() || '',
          is_active: isActive,
        })
        alert.success('Berhasil', 'Kemasan diperbarui.')
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
            {mode === 'create' ? 'Kemasan baru' : 'Edit kemasan'}
          </CardTitle>
          <CardDescription>
            Satu baris per ukuran (mis. 0,25 kg, 10 kg). Harga total kemasan dihitung otomatis dari
            harga per kg produk dikali berat bersih — tidak diatur per kemasan. Setara kemasan
            mengikuti stok utama varian (kg) dibagi berat bersih per kemasan (kg) — ubah massa
            varian lewat mutasi atau produksi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pkg-label">Label kemasan</Label>
              <Input
                id="pkg-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={submitting}
                className="border-outline-variant"
                placeholder="250g"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pkg-type">Jenis kemasan</Label>
              <Select
                value={packagingType}
                onValueChange={(v) => setPackagingType(v as PackagingType)}
                disabled={submitting}
              >
                <SelectTrigger id="pkg-type" className="border-outline-variant w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PACKAGING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {PACKAGING_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pkg-mass">Berat bersih (kg)</Label>
              <Input
                id="pkg-mass"
                type="number"
                min={0.000001}
                step="any"
                value={netMassKg}
                onChange={(e) => setNetMassKg(e.target.value.replace(/[^0-9.,]/g, ''))}
                disabled={submitting}
                className="border-outline-variant"
                placeholder="10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pkg-sku">SKU (opsional)</Label>
              <Input
                id="pkg-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={submitting}
                className="border-outline-variant"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="pkg-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
              disabled={submitting}
            />
            <Label htmlFor="pkg-active" className="font-normal">
              Kemasan aktif
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
