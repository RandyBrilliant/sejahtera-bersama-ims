import { useState } from 'react'
import { Link } from 'react-router-dom'

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
import { alert } from '@/lib/alert'
import { cn } from '@/lib/utils'
import { useProductPackagingListQuery } from '@/hooks/use-inventory-query'
import {
  useCreateSalesOrderMutation,
  useCustomersQuery,
  useSalesOrderQuery,
  useUpdateSalesOrderMutation,
} from '@/hooks/use-purchase-query'
import { canEditOrderLines, ORDER_STATUS_LABEL } from '@/constants/order-status'
import type { OrderStatus, SalesOrder, SalesOrderLineInput } from '@/types/purchase'

const listParams = { page: 1, page_size: 500 } as const

const EDITABLE_STATUS: OrderStatus[] = ['DRAFT', 'SUBMITTED', 'AWAITING_PAYMENT']

const NO_CUSTOMER = '__none__' as const

type LineDraft = {
  product_packaging: number | ''
  quantity: string
  unit_price_idr: string
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
  const packagingQuery = useProductPackagingListQuery(listParams)

  const customers = customersQuery.data?.results ?? []
  const packagingRows = packagingQuery.data?.results ?? []

  const [customerId, setCustomerId] = useState<number | ''>(() =>
    initial?.customer != null ? initial.customer : ''
  )
  const [status, setStatus] = useState<OrderStatus>(() => {
    const s = initial?.status
    if (s && EDITABLE_STATUS.includes(s)) return s
    return 'DRAFT'
  })
  const [invoiceNumber, setInvoiceNumber] = useState(() => initial?.invoice_number ?? '')
  const [invoiceDate, setInvoiceDate] = useState(() =>
    initial?.invoice_date ? initial.invoice_date.slice(0, 10) : ''
  )
  const [dueDate, setDueDate] = useState(() =>
    initial?.due_date ? initial.due_date.slice(0, 10) : ''
  )
  const [taxAmount, setTaxAmount] = useState(() =>
    initial ? String(initial.tax_amount_idr ?? 0) : '0'
  )
  const [notes, setNotes] = useState(() => initial?.notes ?? '')
  const [lines, setLines] = useState<LineDraft[]>(() => linesFromInitial(initial))

  const createMut = useCreateSalesOrderMutation()
  const updateMut = useUpdateSalesOrderMutation(orderId ?? 0)

  function addLine() {
    setLines((rows) => [...rows, { product_packaging: '', quantity: '', unit_price_idr: '' }])
  }

  function removeLine(idx: number) {
    setLines((rows) => rows.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
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
      status,
      invoice_number: invoiceNumber.trim() || undefined,
      invoice_date: invoiceDate || null,
      due_date: dueDate || null,
      tax_amount_idr: Number(taxAmount) || 0,
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
            <Label>Pelanggan</Label>
            {customersQuery.isLoading ? (
              <p className="text-on-surface-variant text-sm">Memuat pelanggan…</p>
            ) : (
              <Select
                value={customerId === '' ? NO_CUSTOMER : String(customerId)}
                onValueChange={(v) => setCustomerId(v === NO_CUSTOMER ? '' : Number(v))}
                disabled={pending}
              >
                <SelectTrigger className="border-outline-variant w-full">
                  <SelectValue placeholder="Pilih pelanggan…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CUSTOMER}>— Pilih —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as OrderStatus)}
              disabled={pending}
            >
              <SelectTrigger className="border-outline-variant w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="so-inv">Nomor faktur</Label>
            <Input
              id="so-inv"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="so-tax">Pajak (IDR)</Label>
            <Input
              id="so-tax"
              inputMode="numeric"
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="so-inv-date">Tanggal faktur</Label>
            <Input
              id="so-inv-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="so-due">Jatuh tempo</Label>
            <Input
              id="so-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
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
              <div
                key={idx}
                className="border-outline-variant grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_minmax(0,7rem)_minmax(0,9rem)_auto]"
              >
                <div className="grid gap-1">
                  <Label className="text-xs">Kemasan (SKU)</Label>
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
                      {packagingRows.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.product_variant_name} · {p.label} · {p.sku}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Kuantitas</Label>
                  <Input
                    inputMode="decimal"
                    value={row.quantity}
                    onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                    disabled={pending}
                    className="border-outline-variant"
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Harga satuan (IDR, opsional)</Label>
                  <Input
                    inputMode="numeric"
                    value={row.unit_price_idr}
                    onChange={(e) => updateLine(idx, { unit_price_idr: e.target.value })}
                    disabled={pending}
                    placeholder="Auto"
                    className="border-outline-variant"
                  />
                </div>
                <div className="flex items-end">
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
              </div>
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
