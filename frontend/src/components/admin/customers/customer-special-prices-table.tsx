import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DEFAULT_TABLE_PAGE_SIZE } from '@/constants/table-pagination'
import { useProductPackagingListQuery } from '@/hooks/use-inventory-query'
import {
  useCreateCustomerProductPriceMutation,
  useCustomerProductPricesQuery,
  useDeleteCustomerProductPriceMutation,
  useUpdateCustomerProductPriceMutation,
} from '@/hooks/use-purchase-query'
import { alert } from '@/lib/alert'
import { formatIdr } from '@/lib/format-idr'
import type { CustomerProductPrice } from '@/types/purchase'

const NO_PKG = '__none__' as const

type Props = {
  customerId: number
  canWrite: boolean
}

type FormState = {
  product_packaging: number | ''
  selling_price_idr: string
  note: string
  is_active: boolean
}

const emptyForm = (): FormState => ({
  product_packaging: '',
  selling_price_idr: '',
  note: '',
  is_active: true,
})

function parseMutationError(err: unknown): string {
  const ax = err as {
    response?: { data?: { detail?: string; errors?: Record<string, unknown> } }
  }
  const d = ax.response?.data
  if (!d) return err instanceof Error ? err.message : 'Terjadi kesalahan.'
  if (typeof d.detail === 'string') return d.detail
  if (d.errors && typeof d.errors === 'object') {
    const parts: string[] = []
    for (const [k, v] of Object.entries(d.errors)) {
      const msg = Array.isArray(v) ? v[0] : String(v)
      if (msg) parts.push(`${k}: ${msg}`)
    }
    if (parts.length) return parts.join(' ')
  }
  return 'Validasi gagal.'
}

export function CustomerSpecialPricesTable({ customerId, canWrite }: Props) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<CustomerProductPrice | null>(null)
  const [deleteRow, setDeleteRow] = useState<CustomerProductPrice | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const listParams = useMemo(
    () => ({
      customer: customerId,
      page_size: DEFAULT_TABLE_PAGE_SIZE,
      ordering: '-updated_at',
    }),
    [customerId]
  )

  const { data, isLoading, isError } = useCustomerProductPricesQuery(listParams)
  const { data: pkgPage } = useProductPackagingListQuery({
    page: 1,
    page_size: 500,
    is_active: true,
  })
  const packagings = pkgPage?.results ?? []
  const rows = data?.results ?? []

  const createMutation = useCreateCustomerProductPriceMutation()
  const updateMutation = useUpdateCustomerProductPriceMutation()
  const deleteMutation = useDeleteCustomerProductPriceMutation()
  const pending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setEditorOpen(true)
  }

  function openEdit(row: CustomerProductPrice) {
    setEditing(row)
    setForm({
      product_packaging: row.product_packaging,
      selling_price_idr: String(row.selling_price_idr),
      note: row.note || '',
      is_active: row.is_active,
    })
    setEditorOpen(true)
  }

  async function handleSave() {
    if (form.product_packaging === '') {
      alert.error('Validasi', 'Pilih kemasan produk.')
      return
    }
    const price = Number(form.selling_price_idr)
    if (!Number.isFinite(price) || price < 1) {
      alert.error('Validasi', 'Harga jual per kemasan wajib diisi (minimal 1).')
      return
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            product_packaging: form.product_packaging as number,
            selling_price_idr: Math.round(price),
            note: form.note.trim() || undefined,
            is_active: form.is_active,
          },
        })
        alert.success('Berhasil', 'Harga khusus diperbarui.')
      } else {
        await createMutation.mutateAsync({
          customer: customerId,
          product_packaging: form.product_packaging as number,
          selling_price_idr: Math.round(price),
          note: form.note.trim() || undefined,
          is_active: form.is_active,
        })
        alert.success('Berhasil', 'Harga khusus ditambahkan.')
      }
      setEditorOpen(false)
    } catch (err) {
      alert.error('Gagal menyimpan', parseMutationError(err))
    }
  }

  async function handleDelete() {
    if (!deleteRow) return
    try {
      await deleteMutation.mutateAsync(deleteRow.id)
      alert.success('Berhasil', 'Harga khusus dihapus.')
      setDeleteRow(null)
    } catch (err) {
      alert.error('Gagal menghapus', parseMutationError(err))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-on-surface font-heading text-lg font-semibold">Harga khusus</h2>
          <p className="text-on-surface-variant text-sm">
            Harga jual per kemasan untuk pelanggan ini. Dipakai otomatis saat membuat pesanan penjualan
            (bisa diganti per baris order).
          </p>
        </div>
        {canWrite ? (
          <Button type="button" size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="size-4" />
            Tambah harga
          </Button>
        ) : null}
      </div>

      {isError ? (
        <p className="text-destructive text-sm">Gagal memuat harga khusus.</p>
      ) : isLoading ? (
        <p className="text-on-surface-variant text-sm">Memuat harga khusus…</p>
      ) : rows.length === 0 ? (
        <p className="text-on-surface-variant text-sm">
          Belum ada harga khusus.
          {canWrite ? (
            <>
              {' '}
              <button
                type="button"
                className="text-primary font-medium underline"
                onClick={openCreate}
              >
                Tambah harga pertama
              </button>
            </>
          ) : null}
        </p>
      ) : (
        <div className="border-outline-variant ambient-shadow overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="border-outline-variant hover:bg-transparent">
                <TableHead>Varian</TableHead>
                <TableHead>Kemasan</TableHead>
                <TableHead>Harga / kemasan</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Status</TableHead>
                {canWrite ? <TableHead className="w-24" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="border-outline-variant">
                  <TableCell className="font-medium">{row.variant_name}</TableCell>
                  <TableCell>{row.packaging_label}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatIdr(row.selling_price_idr)}
                  </TableCell>
                  <TableCell className="text-on-surface-variant max-w-[160px] truncate text-sm">
                    {row.note || '—'}
                  </TableCell>
                  <TableCell>
                    {row.is_active ? (
                      <Badge variant="default">Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  {canWrite ? (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-8 px-0"
                          onClick={() => openEdit(row)}
                          aria-label={`Edit harga ${row.packaging_label}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive size-8 px-0"
                          onClick={() => setDeleteRow(row)}
                          aria-label={`Hapus harga ${row.packaging_label}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="border-outline-variant bg-card sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit harga khusus' : 'Tambah harga khusus'}</DialogTitle>
            <DialogDescription>
              Harga adalah total jual per kemasan (bukan per kg).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Kemasan</Label>
              <Select
                value={
                  form.product_packaging === '' ? NO_PKG : String(form.product_packaging)
                }
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    product_packaging: v === NO_PKG ? '' : Number(v),
                  }))
                }
                disabled={pending || !!editing}
              >
                <SelectTrigger className="border-outline-variant w-full">
                  <SelectValue placeholder="Pilih kemasan…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PKG}>— Pilih —</SelectItem>
                  {packagings.map((pkg) => (
                    <SelectItem key={pkg.id} value={String(pkg.id)}>
                      {pkg.product_variant_name} · {pkg.label} (default{' '}
                      {formatIdr(pkg.total_price_idr)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cpp-price">Harga jual / kemasan (IDR)</Label>
              <Input
                id="cpp-price"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={form.selling_price_idr}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    selling_price_idr: e.target.value.replace(/[^0-9]/g, ''),
                  }))
                }
                disabled={pending}
                className="border-outline-variant"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cpp-note">Catatan (opsional)</Label>
              <Input
                id="cpp-note"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                disabled={pending}
                className="border-outline-variant"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.is_active ? '1' : '0'}
                onValueChange={(v) => setForm((f) => ({ ...f, is_active: v === '1' }))}
                disabled={pending}
              >
                <SelectTrigger className="border-outline-variant w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Aktif</SelectItem>
                  <SelectItem value="0">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditorOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={pending}>
              {pending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteRow}
        onOpenChange={(o) => {
          if (!o) setDeleteRow(null)
        }}
      >
        <DialogContent className="border-outline-variant bg-card sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Hapus harga khusus?</DialogTitle>
            <DialogDescription>
              Harga untuk{' '}
              <span className="font-semibold">
                {deleteRow?.variant_name} · {deleteRow?.packaging_label}
              </span>{' '}
              akan dihapus. Pesanan baru akan memakai harga default produk.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteRow(null)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              type="button"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void handleDelete()}
              disabled={pending || !deleteRow}
            >
              {pending ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
