import { useState } from 'react'

import {
  useCreateProductPackagingMutation,
  useUpdateProductPackagingMutation,
} from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { parseInventoryMutationError } from '@/components/admin/inventory/inventory-mutation-error'
import type { ProductPackaging } from '@/types/inventory'

type Props = {
  mode: 'create' | 'edit'
  productId: number
  initial: ProductPackaging | null
  onCancel: () => void
  onSaved: () => void
}

export function ProductPackagingForm({ mode, productId, initial, onCancel, onSaved }: Props) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [netMassKg, setNetMassKg] = useState(
    initial ? String(initial.net_mass_kg) : ''
  )
  const [basePrice, setBasePrice] = useState(
    initial ? String(initial.base_price_idr) : ''
  )
  const [listPrice, setListPrice] = useState(
    initial?.list_price_idr != null ? String(initial.list_price_idr) : ''
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
    const base = Number(basePrice)
    if (!Number.isFinite(base) || base < 1) {
      alert.error('Validasi', 'Harga pokok (IDR) wajib diisi.')
      return
    }

    const listVal = listPrice.trim() ? Number(listPrice) : null
    if (listPrice.trim() && (!Number.isFinite(listVal) || (listVal ?? 0) < 1)) {
      alert.error('Validasi', 'Harga jual daftar tidak valid.')
      return
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          product: productId,
          label: label.trim(),
          net_mass_kg: kgRaw,
          base_price_idr: Math.floor(base),
          list_price_idr: listVal != null && Number.isFinite(listVal) ? Math.floor(listVal) : null,
          sku: sku.trim() || '',
          is_active: isActive,
        })
        alert.success('Berhasil', 'Kemasan ditambahkan.')
      } else {
        if (!initial) return
        await updateMutation.mutateAsync({
          label: label.trim(),
          net_mass_kg: kgRaw,
          base_price_idr: Math.floor(base),
          list_price_idr: listPrice.trim() ? Math.floor(Number(listPrice)) : null,
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
            Satu baris per ukuran (mis. 0,25 kg, 10 kg). Harga dalam Rupiah penuh tanpa desimal.
            Setara kemasan mengikuti stok utama varian (kg) dibagi berat bersih per kemasan (kg)
            — ubah massa varian lewat mutasi atau produksi.
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
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2 md:col-span-1">
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
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="pkg-base">Harga pokok (IDR)</Label>
              <CurrencyInput
                id="pkg-base"
                value={basePrice}
                onChange={setBasePrice}
                disabled={submitting}
                className="border-outline-variant"
                placeholder="Mis. 15.000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pkg-list">Harga jual daftar (IDR, opsional)</Label>
              <CurrencyInput
                id="pkg-list"
                value={listPrice}
                onChange={setListPrice}
                disabled={submitting}
                className="border-outline-variant"
                placeholder="Kosong jika mengikuti kebijakan lain"
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
