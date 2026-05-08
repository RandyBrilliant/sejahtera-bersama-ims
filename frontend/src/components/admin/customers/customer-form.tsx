import { useState } from 'react'

import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useWilayahQuery,
} from '@/hooks/use-purchase-query'
import { alert } from '@/lib/alert'
import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RegionalPhoneInput } from '@/components/ui/regional-phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Customer } from '@/types/purchase'

type Props = {
  mode: 'create' | 'edit'
  initial: Customer | null
  onCancel: () => void
  onSaved: () => void
}

function RequiredAsterisk() {
  return (
    <span className="text-destructive" aria-hidden>
      {' '}
      *
    </span>
  )
}

export function CustomerForm({ mode, initial, onCancel, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [wilayahId, setWilayahId] = useState<string>(initial?.wilayah != null ? String(initial.wilayah) : '__none')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  const createMutation = useCreateCustomerMutation()
  const updateMutation = useUpdateCustomerMutation(initial?.id ?? 0)
  const wilayahQuery = useWilayahQuery({ page: 1, page_size: 200, ordering: 'name' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const p = phone.trim()
    if (!n) {
      alert.error('Validasi', 'Nama pelanggan wajib diisi.')
      return
    }
    const a = address.trim()
    if (!a) {
      alert.error('Validasi', 'Alamat wajib diisi.')
      return
    }

    const payload = {
      name: n,
      phone: p || undefined,
      address: a,
      notes: notes.trim() || undefined,
      wilayah: wilayahId === '__none' ? null : Number(wilayahId),
      is_active: isActive,
    }

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload)
        alert.success('Berhasil', 'Pelanggan ditambahkan.')
      } else {
        if (!initial) return
        await updateMutation.mutateAsync(payload)
        alert.success('Berhasil', 'Data pelanggan diperbarui.')
      }
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parsePurchaseMutationError(err))
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">
            {mode === 'create' ? 'Pelanggan baru' : 'Data pelanggan'}
          </CardTitle>
          <CardDescription>
            Dipakai untuk penjualan dan invoice. Alamat wajib untuk pengiriman.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cust-name">
                Nama pelanggan
                <RequiredAsterisk />
              </Label>
              <Input
                id="cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                className="border-outline-variant"
                autoComplete="organization"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust-phone">
                Telepon
              </Label>
              <RegionalPhoneInput
                id="cust-phone"
                value={phone}
                onChange={setPhone}
                disabled={submitting}
              />
            </div>
            <div className="grid gap-2">
              <Label>Wilayah</Label>
              <Select value={wilayahId} onValueChange={setWilayahId} disabled={submitting || wilayahQuery.isLoading}>
                <SelectTrigger className="border-outline-variant">
                  <SelectValue placeholder="Pilih wilayah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Tanpa wilayah</SelectItem>
                  {(wilayahQuery.data?.results ?? []).map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cust-address">
                Alamat
                <RequiredAsterisk />
              </Label>
              <textarea
                id="cust-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={submitting}
                rows={3}
                className="border-outline-variant bg-background focus-visible:ring-ring placeholder:text-muted-foreground flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cust-notes">Catatan</Label>
              <textarea
                id="cust-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                rows={2}
                className="border-outline-variant bg-background focus-visible:ring-ring placeholder:text-muted-foreground flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="cust-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
              disabled={submitting}
            />
            <Label htmlFor="cust-active" className="font-normal">
              Pelanggan aktif (muncul di form penjualan)
            </Label>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="ambient-shadow">
              {submitting ? 'Menyimpan…' : 'Simpan'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Batal
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
