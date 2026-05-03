import { useState } from 'react'

import {
  useCreateProductMutation,
  useUpdateProductMutation,
} from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { parseInventoryMutationError } from '@/components/admin/inventory/inventory-mutation-error'
import type { Product } from '@/types/inventory'

type ProductFormProps = {
  mode: 'create' | 'edit'
  initialProduct: Product | null
  onCancel: () => void
  onSaved: () => void
}

export function ProductForm({ mode, initialProduct, onCancel, onSaved }: ProductFormProps) {
  const [name, setName] = useState(
    mode === 'edit' && initialProduct ? initialProduct.name : 'Bawang Goreng'
  )
  const [variantName, setVariantName] = useState(
    mode === 'edit' && initialProduct ? initialProduct.variant_name : ''
  )
  const [isActive, setIsActive] = useState(
    mode === 'edit' && initialProduct ? initialProduct.is_active : true
  )

  const createMutation = useCreateProductMutation()
  const updateMutation = useUpdateProductMutation(initialProduct?.id ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!variantName.trim()) {
      alert.error('Validasi', 'Jenis / varian produk wajib diisi.')
      return
    }
    if (!name.trim()) {
      alert.error('Validasi', 'Nama produk wajib diisi.')
      return
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: name.trim(),
          variant_name: variantName.trim(),
          is_active: isActive,
        })
        alert.success('Berhasil', 'Produk berhasil dibuat.')
      } else {
        if (!initialProduct) return
        await updateMutation.mutateAsync({
          name: name.trim(),
          variant_name: variantName.trim(),
          is_active: isActive,
        })
        alert.success('Berhasil', 'Produk diperbarui.')
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
            {mode === 'create' ? 'Produk baru' : 'Data produk'}
          </CardTitle>
          <CardDescription>
            Satu produk merepresentasikan satu varian bawang goreng (mis. Original, Pedas). Kemasan
            ukuran ditambahkan sebagai SKU terpisah setelah produk disimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="inv-product-name">Nama produk</Label>
            <Input
              id="inv-product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              className="border-outline-variant"
              placeholder="Bawang Goreng"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="inv-variant">Jenis / varian</Label>
            <Input
              id="inv-variant"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              disabled={submitting}
              className="border-outline-variant"
              placeholder="Contoh: Original, Pedas"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="inv-product-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
              disabled={submitting}
            />
            <Label htmlFor="inv-product-active" className="font-normal">
              Produk aktif (tampil untuk produksi & penjualan)
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
