import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { ENTRY_KIND_LABEL } from '@/constants/expenses'
import {
  useCreateOperationalCashEntryMutation,
  useOperationalCategoriesQuery,
  useUpdateOperationalCashEntryMutation,
  useUploadOperationalCashEntryAttachmentMutation,
} from '@/hooks/use-expenses-query'
import { alert } from '@/lib/alert'
import { resolveMediaUrl } from '@/lib/media-url'
import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
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
import type { EntryKind, OperationalCashEntry } from '@/types/expenses'

type Props = {
  mode: 'create' | 'edit'
  initial: OperationalCashEntry | null
  onCancel: () => void
  onSaved: () => void
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function OperationalCashEntryForm({ mode, initial, onCancel, onSaved }: Props) {
  const [direction, setDirection] = useState<EntryKind>(initial?.direction ?? 'EXPENSE')
  const [categoryId, setCategoryId] = useState<number | ''>(
    initial?.category != null ? initial.category : ''
  )
  const [amount, setAmount] = useState(
    initial != null ? String(initial.amount_idr) : ''
  )
  const [occurredOn, setOccurredOn] = useState(initial?.occurred_on ?? todayIso())
  const [description, setDescription] = useState(initial?.description ?? '')
  const [reference, setReference] = useState(initial?.reference ?? '')
  const [salesOrderId, setSalesOrderId] = useState(
    initial?.sales_order != null ? String(initial.sales_order) : ''
  )
  const [purchaseInOrderId, setPurchaseInOrderId] = useState(
    initial?.purchase_in_order != null ? String(initial.purchase_in_order) : ''
  )
  const [file, setFile] = useState<File | null>(null)

  const catParams = useMemo(
    () => ({
      entry_kind: direction,
      is_active: true,
      page_size: 200,
      ordering: 'sort_order,name',
    }),
    [direction]
  )
  const categoriesQuery = useOperationalCategoriesQuery(catParams)
  const categories = categoriesQuery.data?.results ?? []

  const createMutation = useCreateOperationalCashEntryMutation()
  const updateMutation = useUpdateOperationalCashEntryMutation(initial?.id ?? 0)
  const uploadMutation = useUploadOperationalCashEntryAttachmentMutation(initial?.id ?? 0)

  function parseOptionalInt(raw: string): number | null {
    const t = raw.trim()
    if (!t) return null
    const n = Number.parseInt(t, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (categoryId === '') {
      alert.error('Validasi', 'Pilih kategori.')
      return
    }
    const amt = Number.parseInt(amount.replace(/\s/g, ''), 10)
    if (!Number.isFinite(amt) || amt < 1) {
      alert.error('Validasi', 'Jumlah (Rp) wajib berupa bilangan bulat positif.')
      return
    }
    const desc = description.trim()
    if (!desc) {
      alert.error('Validasi', 'Deskripsi wajib diisi.')
      return
    }

    const refStr = reference.trim()
    const soId = parseOptionalInt(salesOrderId)
    const piId = parseOptionalInt(purchaseInOrderId)

    try {
      if (mode === 'create') {
        const body =
          direction === 'INCOME'
            ? {
                direction,
                category: categoryId as number,
                amount_idr: amt,
                occurred_on: occurredOn,
                description: desc,
                reference: refStr || undefined,
                sales_order: soId,
                purchase_in_order: null,
              }
            : {
                direction,
                category: categoryId as number,
                amount_idr: amt,
                occurred_on: occurredOn,
                description: desc,
                reference: refStr || undefined,
                purchase_in_order: piId,
                sales_order: null,
              }
        await createMutation.mutateAsync(body)
        alert.success('Berhasil', 'Transaksi kas ditambahkan.')
      } else {
        if (!initial) return
        const body =
          direction === 'INCOME'
            ? {
                direction,
                category: categoryId as number,
                amount_idr: amt,
                occurred_on: occurredOn,
                description: desc,
                reference: refStr || undefined,
                sales_order: soId,
                purchase_in_order: null,
              }
            : {
                direction,
                category: categoryId as number,
                amount_idr: amt,
                occurred_on: occurredOn,
                description: desc,
                reference: refStr || undefined,
                purchase_in_order: piId,
                sales_order: null,
              }
        await updateMutation.mutateAsync(body)
        alert.success('Berhasil', 'Transaksi diperbarui.')
      }
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parsePurchaseMutationError(err))
    }
  }

  async function handleUploadAttachment() {
    if (!initial || !file) {
      alert.error('Validasi', 'Pilih berkas terlebih dahulu.')
      return
    }
    try {
      await uploadMutation.mutateAsync(file)
      alert.success('Berhasil', 'Lampiran diunggah.')
      setFile(null)
    } catch (err) {
      alert.error('Gagal unggah', parsePurchaseMutationError(err))
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending
  const uploading = uploadMutation.isPending
  const attachmentHref = resolveMediaUrl(initial?.attachment ?? null)

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-outline-variant bg-card">
          <CardHeader className="border-outline-variant border-b pb-4">
            <CardTitle className="text-base">
              {mode === 'create' ? 'Transaksi baru' : 'Detail transaksi'}
            </CardTitle>
            <CardDescription>
              Kategori harus sesuai jenis pemasukan/pengeluaran. Tautan order opsional (lihat ID di
              menu Pesanan).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Jenis</Label>
                <Select
                  value={direction}
                  onValueChange={(v) => {
                    setDirection(v as EntryKind)
                    setCategoryId('')
                  }}
                  disabled={submitting}
                >
                  <SelectTrigger className="border-outline-variant w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ENTRY_KIND_LABEL) as EntryKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {ENTRY_KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Kategori</Label>
                <Select
                  value={categoryId === '' ? '' : String(categoryId)}
                  onValueChange={(v) => setCategoryId(v === '' ? '' : Number(v))}
                  disabled={submitting || categoriesQuery.isLoading}
                >
                  <SelectTrigger className="border-outline-variant w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amt">Jumlah (Rp)</Label>
                <Input
                  id="amt"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={submitting}
                  className="border-outline-variant tabular-nums"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="occ">Tanggal</Label>
                <Input
                  id="occ"
                  type="date"
                  value={occurredOn}
                  onChange={(e) => setOccurredOn(e.target.value)}
                  disabled={submitting}
                  className="border-outline-variant"
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="desc">Deskripsi</Label>
                <textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  className="border-outline-variant bg-background focus-visible:ring-ring placeholder:text-muted-foreground flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="ref">Referensi (opsional)</Label>
                <Input
                  id="ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={submitting}
                  className="border-outline-variant"
                  placeholder="No. invoice / kode"
                />
              </div>
              {direction === 'INCOME' ? (
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="so">ID pesanan penjualan (opsional)</Label>
                  <Input
                    id="so"
                    inputMode="numeric"
                    value={salesOrderId}
                    onChange={(e) => setSalesOrderId(e.target.value)}
                    disabled={submitting}
                    className="border-outline-variant"
                    placeholder="Contoh: 12"
                  />
                  <p className="text-on-surface-variant text-xs">
                    <Link to="/admin/pesanan/penjualan" className="text-primary font-medium">
                      Lihat daftar penjualan
                    </Link>{' '}
                    untuk mencari ID order.
                  </p>
                </div>
              ) : (
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="pi">ID pesanan pembelian bahan (opsional)</Label>
                  <Input
                    id="pi"
                    inputMode="numeric"
                    value={purchaseInOrderId}
                    onChange={(e) => setPurchaseInOrderId(e.target.value)}
                    disabled={submitting}
                    className="border-outline-variant"
                    placeholder="Contoh: 5"
                  />
                  <p className="text-on-surface-variant text-xs">
                    <Link to="/admin/pesanan/pembelian" className="text-primary font-medium">
                      Lihat daftar pembelian
                    </Link>{' '}
                    untuk mencari ID order.
                  </p>
                </div>
              )}
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

      {mode === 'edit' && initial ? (
        <Card className="border-outline-variant bg-card">
          <CardHeader className="border-outline-variant border-b pb-4">
            <CardTitle className="text-base">Lampiran</CardTitle>
            <CardDescription>
              Unggah bukti pembayaran atau dokumen pendukung (satu berkas per permintaan).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {attachmentHref ? (
              <p className="text-sm">
                <a
                  href={attachmentHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-medium underline"
                >
                  Buka lampiran saat ini
                </a>
              </p>
            ) : (
              <p className="text-on-surface-variant text-sm">Belum ada lampiran.</p>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid gap-2">
                <Label htmlFor="attach">Berkas</Label>
                <Input
                  id="attach"
                  type="file"
                  disabled={uploading}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="border-outline-variant max-w-xs cursor-pointer"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={uploading || !file}
                onClick={() => void handleUploadAttachment()}
              >
                {uploading ? 'Mengunggah…' : 'Unggah'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
