import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RegionalPhoneInput } from '@/components/ui/regional-phone-input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/ui/currency-input'
import { alert } from '@/lib/alert'
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import { useProductPackagingListQuery } from '@/hooks/use-inventory-query'
import {
  useCreateCustomerMutation,
  useCreateSalesOrderMutation,
  useCustomersQuery,
  useSalesOrderQuery,
  useUpdateSalesOrderMutation,
  useWilayahQuery,
} from '@/hooks/use-purchase-query'
import { canEditOrderLines } from '@/constants/order-status'
import type { SalesOrder, SalesOrderLineInput } from '@/types/purchase'

const listParams = { page: 1, page_size: 500 } as const

function isoTomorrowLocal(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function defaultSalesInvoiceNumber(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `INV-SO-${yyyy}${mm}${dd}-${hh}${mi}${ss}`
}

type LineDraft = {
  product_packaging: number | ''
  quantity: string
  unit_price_idr: string
}

function RequiredAsterisk() {
  return (
    <span className="text-destructive" aria-hidden>
      {' '}
      *
    </span>
  )
}

function linesFromInitial(order: SalesOrder | null): LineDraft[] {
  if (!order?.lines?.length) {
    return [{ product_packaging: '', quantity: '', unit_price_idr: '' }]
  }
  return order.lines.map((l) => ({
    product_packaging: l.product_packaging,
    quantity: String(l.quantity),
    unit_price_idr: String(l.unit_price_idr),
  }))
}

type InnerProps = {
  mode: 'create' | 'edit'
  orderId?: number
  initial: SalesOrder | null
  onCancel: () => void
  onSaved: (id: number) => void
}

function SalesOrderFormInner({ mode, orderId, initial, onCancel, onSaved }: InnerProps) {
  const customersQuery = useCustomersQuery({ ...listParams, is_active: true })
  const wilayahQuery = useWilayahQuery({ page: 1, page_size: 200, ordering: 'name' })
  const packagingQuery = useProductPackagingListQuery(listParams)

  const customers = useMemo(() => customersQuery.data?.results ?? [], [customersQuery.data?.results])
  const packagingRows = packagingQuery.data?.results ?? []

  const [customerId, setCustomerId] = useState<number | ''>(() =>
    initial?.customer != null ? initial.customer : ''
  )
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    if (initial?.invoice_number) return initial.invoice_number
    return mode === 'create' ? defaultSalesInvoiceNumber() : ''
  })
  const [invoiceDate, setInvoiceDate] = useState(() =>
    initial?.invoice_date ? initial.invoice_date.slice(0, 10) : isoTomorrowLocal()
  )
  const [notes, setNotes] = useState(() => initial?.notes ?? '')
  const [lines, setLines] = useState<LineDraft[]>(() => linesFromInitial(initial))
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [newCustomerNotes, setNewCustomerNotes] = useState('')
  const [newCustomerWilayahId, setNewCustomerWilayahId] = useState('__none')

  const createCustomerMut = useCreateCustomerMutation()
  const createMut = useCreateSalesOrderMutation()
  const updateMut = useUpdateSalesOrderMutation(orderId ?? 0)

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.wilayah_name ?? '').toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      )
    })
  }, [customerSearch, customers])

  function addLine() {
    setLines((rows) => [...rows, { product_packaging: '', quantity: '', unit_price_idr: '' }])
  }

  function removeLine(idx: number) {
    setLines((rows) => rows.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  function toFiniteNumber(value: string): number | null {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  async function handleCreateCustomerFromModal(e: React.FormEvent) {
    e.preventDefault()
    const name = newCustomerName.trim()
    const address = newCustomerAddress.trim()
    if (!name) {
      alert.error('Validasi', 'Nama pelanggan wajib diisi.')
      return
    }
    if (!address) {
      alert.error('Validasi', 'Alamat pelanggan wajib diisi.')
      return
    }
    try {
      const created = await createCustomerMut.mutateAsync({
        name,
        phone: newCustomerPhone.trim() || undefined,
        address,
        wilayah: newCustomerWilayahId === '__none' ? null : Number(newCustomerWilayahId),
        notes: newCustomerNotes.trim() || undefined,
        is_active: true,
      })
      setCustomerId(created.id)
      setCustomerSearch(created.name)
      setCustomerDropdownOpen(false)
      setCustomerModalOpen(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      setNewCustomerAddress('')
      setNewCustomerNotes('')
      setNewCustomerWilayahId('__none')
      void customersQuery.refetch()
      alert.success('Berhasil', 'Pelanggan baru ditambahkan.')
    } catch (err) {
      alert.error('Gagal menambah pelanggan', parsePurchaseMutationError(err))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (customerId === '') {
      alert.error('Validasi', 'Pilih pelanggan.')
      return
    }
    const payloadLines: SalesOrderLineInput[] = []
    for (const row of lines) {
      const pid = row.product_packaging === '' ? NaN : Number(row.product_packaging)
      const qty = row.quantity.trim()
      const priceRaw = row.unit_price_idr.trim()
      if (!qty || Number.isNaN(pid) || pid <= 0) {
        alert.error('Validasi', 'Setiap baris wajib memilih kemasan dan kuantitas.')
        return
      }
      const line: SalesOrderLineInput = {
        product_packaging: pid,
        quantity: qty,
      }
      if (priceRaw) {
        line.unit_price_idr = Number(priceRaw)
      }
      payloadLines.push(line)
    }
    if (payloadLines.length === 0) {
      alert.error('Validasi', 'Minimal satu baris produk.')
      return
    }

    const body = {
      customer: customerId as number,
      invoice_number: invoiceNumber.trim() || undefined,
      invoice_date: invoiceDate || null,
      notes: notes.trim(),
      lines: payloadLines,
    }

    try {
      if (mode === 'create') {
        const o = await createMut.mutateAsync(body)
        alert.success('Berhasil', 'Order penjualan dibuat.')
        onSaved(o.id)
      } else {
        if (!orderId) return
        await updateMut.mutateAsync(body)
        alert.success('Berhasil', 'Order penjualan diperbarui.')
        onSaved(orderId)
      }
    } catch (err) {
      alert.error('Gagal menyimpan', parsePurchaseMutationError(err))
    }
  }

  const pending = createMut.isPending || updateMut.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">Pelanggan & faktur</CardTitle>
          <CardDescription>
            Harga per baris mengikuti harga khusus pelanggan, list, atau harga pokok jika dikosongkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="so-customer-search">
              Pelanggan
              <RequiredAsterisk />
            </Label>
            <DropdownMenu open={customerDropdownOpen} onOpenChange={setCustomerDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-outline-variant w-full justify-between font-normal"
                  disabled={pending || customersQuery.isLoading}
                >
                  <span className="truncate text-left">
                    {customerId !== ''
                      ? customers.find((c) => c.id === customerId)?.name ?? `#${customerId}`
                      : 'Pilih pelanggan…'}
                  </span>
                  <span className="text-on-surface-variant text-xs">Cari</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={6}
                className="border-outline-variant bg-surface-container-lowest w-[min(44rem,calc(100vw-2rem))] p-2"
              >
                <div className="grid gap-2">
                  <Input
                    id="so-customer-search"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Cari pelanggan (nama, telepon, alamat)…"
                    className="border-outline-variant"
                  />
                  <div className="border-outline-variant max-h-56 overflow-auto rounded-md border">
                    {filteredCustomers.length === 0 ? (
                      <div className="text-on-surface-variant p-3 text-sm">
                        Pelanggan tidak ditemukan.
                      </div>
                    ) : (
                      filteredCustomers.map((c) => {
                        const selected = customerId === c.id
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={cn(
                              'w-full border-b px-3 py-2 text-left text-sm last:border-b-0',
                              selected
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'hover:bg-surface-container-low border-outline-variant text-on-surface'
                            )}
                            onClick={() => {
                              setCustomerId(c.id)
                              setCustomerSearch(c.name)
                              setCustomerDropdownOpen(false)
                            }}
                            disabled={pending}
                          >
                            <div className="font-medium">{c.name}</div>
                            <div className="text-on-surface-variant truncate text-xs">
                              {[c.wilayah_name, c.phone || 'Tanpa telepon', c.address || 'Tanpa alamat']
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCustomerDropdownOpen(false)
                      setCustomerModalOpen(true)
                    }}
                    disabled={pending}
                    className="justify-start"
                  >
                    + Tambah pelanggan baru
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex flex-wrap items-center gap-2">
              {customerId !== '' ? (
                <span className="text-on-surface-variant text-xs">
                  Dipilih:{' '}
                  <span className="text-on-surface font-medium">
                    {customers.find((c) => c.id === customerId)?.name ?? `#${customerId}`}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="so-inv">Nomor faktur</Label>
            <Input
              id="so-inv"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
              placeholder="Otomatis dibuat, bisa diubah manual"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="so-inv-date">Tanggal faktur</Label>
            <DatePickerInput
              id="so-inv-date"
              value={invoiceDate}
              onChange={setInvoiceDate}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="so-notes">Catatan</Label>
            <textarea
              id="so-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
              rows={3}
              className={cn(
                'border-outline-variant bg-background min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm outline-none',
                'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]'
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant flex flex-row flex-wrap items-center justify-between gap-2 border-b pb-4">
          <div>
            <CardTitle className="text-base">Baris produk (kemasan)</CardTitle>
            <CardDescription>
              Harga satuan opsional — dikosongkan memakai harga khusus / list / pokok.
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={pending}>
            Tambah baris
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {packagingQuery.isLoading ? (
            <p className="text-on-surface-variant text-sm">Memuat kemasan…</p>
          ) : (
            lines.map((row, idx) => (
              (() => {
                const qty = toFiniteNumber(row.quantity)
                const unitPrice = toFiniteNumber(row.unit_price_idr)
                const showSubtotal = qty !== null && unitPrice !== null && qty > 0 && unitPrice >= 0

                return (
                  <div key={idx} className="border-outline-variant bg-background space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-surface-container text-on-surface-variant rounded-md px-2 py-0.5 text-xs font-medium">
                          Baris {idx + 1}
                        </span>
                        <span className="text-on-surface-variant text-xs">
                          {showSubtotal
                            ? `Subtotal: ${formatIdr((qty as number) * (unitPrice as number))}`
                            : 'Subtotal: otomatis'}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={pending || lines.length <= 1}
                        onClick={() => removeLine(idx)}
                      >
                        Hapus
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-12">
                      <div className="grid gap-1 md:col-span-7">
                        <Label className="text-xs">
                          Kemasan (SKU)
                          <RequiredAsterisk />
                        </Label>
                        <Select
                          value={row.product_packaging === '' ? '' : String(row.product_packaging)}
                          onValueChange={(v) =>
                            updateLine(idx, { product_packaging: v ? Number(v) : '' })
                          }
                          disabled={pending}
                        >
                          <SelectTrigger className="border-outline-variant w-full min-w-0">
                            <SelectValue placeholder="Pilih kemasan…" />
                          </SelectTrigger>
                          <SelectContent>
                            {packagingRows.map((p) => {
                              const kg = Number(String(p.net_mass_kg).replace(',', '.'))
                              const kgLabel = Number.isFinite(kg)
                                ? `${kg.toLocaleString('id-ID', { maximumFractionDigits: 6 })} kg`
                                : p.net_mass_kg
                              return (
                                <SelectItem key={p.id} value={String(p.id)}>
                                  {p.product_variant_name} · {p.label} · {kgLabel} · {p.sku}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1 md:col-span-2">
                        <Label className="text-xs">
                          Kuantitas
                          <RequiredAsterisk />
                        </Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={row.quantity}
                          onChange={(e) =>
                            updateLine(idx, { quantity: e.target.value.replace(/[^0-9.]/g, '') })
                          }
                          disabled={pending}
                          className="border-outline-variant"
                          placeholder="0"
                          min="0"
                          step="any"
                        />
                      </div>

                      <div className="grid gap-1 md:col-span-3">
                        <Label className="text-xs">Harga satuan (IDR, opsional)</Label>
                        <CurrencyInput
                          value={row.unit_price_idr}
                          onChange={(v) => updateLine(idx, { unit_price_idr: v })}
                          disabled={pending}
                          placeholder="Auto"
                          className="border-outline-variant"
                        />
                      </div>
                    </div>
                  </div>
                )
              })()
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Batal
        </Button>
        <Button
          type="submit"
          disabled={pending || customersQuery.isLoading || packagingQuery.isLoading}
        >
          {pending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>

      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah pelanggan baru</DialogTitle>
            <DialogDescription>
              Tambah pelanggan langsung dari form penjualan, lalu pilih otomatis.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleCreateCustomerFromModal}>
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-name">
                Nama pelanggan
                <RequiredAsterisk />
              </Label>
              <Input
                id="quick-customer-name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                disabled={createCustomerMut.isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-phone">Telepon</Label>
              <RegionalPhoneInput
                id="quick-customer-phone"
                value={newCustomerPhone}
                onChange={setNewCustomerPhone}
                disabled={createCustomerMut.isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-wilayah">Wilayah</Label>
              <Select
                value={newCustomerWilayahId}
                onValueChange={setNewCustomerWilayahId}
                disabled={createCustomerMut.isPending || wilayahQuery.isLoading}
              >
                <SelectTrigger id="quick-customer-wilayah">
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
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-address">
                Alamat
                <RequiredAsterisk />
              </Label>
              <textarea
                id="quick-customer-address"
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                disabled={createCustomerMut.isPending}
                rows={3}
                className={cn(
                  'border-outline-variant bg-background min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm outline-none',
                  'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]'
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-notes">Catatan</Label>
              <Input
                id="quick-customer-notes"
                value={newCustomerNotes}
                onChange={(e) => setNewCustomerNotes(e.target.value)}
                disabled={createCustomerMut.isPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomerModalOpen(false)}
                disabled={createCustomerMut.isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={createCustomerMut.isPending}>
                {createCustomerMut.isPending ? 'Menyimpan…' : 'Simpan pelanggan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  )
}

function SalesOrderEditGate({
  orderId,
  onCancel,
  onSaved,
}: {
  orderId: number
  onCancel: () => void
  onSaved: (id: number) => void
}) {
  const { data: existing, isLoading } = useSalesOrderQuery(orderId)

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat order…</p>
  }

  if (!existing) {
    return <p className="text-destructive text-sm">Order tidak ditemukan.</p>
  }

  if (!canEditOrderLines(existing.status)) {
    return (
      <p className="text-destructive text-sm">
        Order dengan status ini tidak dapat diubah lewat formulir.{' '}
        <Link
          to={`/admin/pesanan/penjualan/${orderId}`}
          className="text-primary font-medium underline underline-offset-2"
        >
          Kembali ke detail
        </Link>
      </p>
    )
  }

  return (
    <SalesOrderFormInner
      key={existing.id}
      mode="edit"
      orderId={orderId}
      initial={existing}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  )
}

type Props = {
  mode: 'create' | 'edit'
  orderId?: number
  onCancel: () => void
  onSaved: (id: number) => void
}

export function SalesOrderForm({ mode, orderId, onCancel, onSaved }: Props) {
  if (mode === 'create') {
    return (
      <SalesOrderFormInner mode="create" initial={null} onCancel={onCancel} onSaved={onSaved} />
    )
  }

  if (!orderId) {
    return <p className="text-destructive text-sm">ID order tidak valid.</p>
  }

  return <SalesOrderEditGate orderId={orderId} onCancel={onCancel} onSaved={onSaved} />
}
