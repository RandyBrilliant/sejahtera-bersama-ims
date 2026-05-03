import { useState } from 'react'

import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from '@/hooks/use-purchase-query'
import { alert } from '@/lib/alert'
import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Customer } from '@/types/purchase'

type Props = {
  mode: 'create' | 'edit'
  initial: Customer | null
  onCancel: () => void
  onSaved: () => void
}

export function CustomerForm({ mode, initial, onCancel, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [companyName, setCompanyName] = useState(initial?.company_name ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [taxId, setTaxId] = useState(initial?.tax_id ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  const createMutation = useCreateCustomerMutation()
  const updateMutation = useUpdateCustomerMutation(initial?.id ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    const p = phone.trim()
    if (!n) {
      alert.error('Validasi', 'Nama pelanggan wajib diisi.')
      return
    }
    if (!p) {
      alert.error('Validasi', 'Nomor telepon wajib diisi.')
      return
    }

    const payload = {
      name: n,
      phone: p,
      company_name: companyName.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      tax_id: taxId.trim() || undefined,
      notes: notes.trim() || undefined,
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
            Dipakai untuk penjualan dan invoice. NPWP opsional; alamat membantu pengiriman.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cust-name">Nama pelanggan</Label>
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
              <Label htmlFor="cust-phone">Telepon</Label>
              <Input
                id="cust-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
                className="border-outline-variant"
                inputMode="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust-email">Email</Label>
              <Input
                id="cust-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="border-outline-variant"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cust-company">Nama perusahaan</Label>
              <Input
                id="cust-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={submitting}
                className="border-outline-variant"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cust-tax">NPWP / ID pajak</Label>
              <Input
                id="cust-tax"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                disabled={submitting}
                className="border-outline-variant"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cust-address">Alamat</Label>
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
