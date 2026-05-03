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
import { useIngredientInventoriesQuery } from '@/hooks/use-inventory-query'
import {
  useCreatePurchaseInOrderMutation,
  usePurchaseInOrderQuery,
  useUpdatePurchaseInOrderMutation,
} from '@/hooks/use-purchase-query'
import { canEditOrderLines, ORDER_STATUS_LABEL } from '@/constants/order-status'
import type { OrderStatus, PurchaseInLineInput, PurchaseInOrder } from '@/types/purchase'

const invListParams = { page: 1, page_size: 500 } as const

const EDITABLE_STATUS: OrderStatus[] = ['DRAFT', 'SUBMITTED', 'AWAITING_PAYMENT']

type LineDraft = {
  ingredient_inventory: number | ''
  quantity: string
  unit_cost_idr: string
}

function linesFromInitial(order: PurchaseInOrder | null): LineDraft[] {
  if (!order?.lines?.length) {
    return [{ ingredient_inventory: '', quantity: '', unit_cost_idr: '' }]
  }
  return order.lines.map((l) => ({
    ingredient_inventory: l.ingredient_inventory,
    quantity: String(l.quantity),
    unit_cost_idr: String(l.unit_cost_idr),
  }))
}

type InnerProps = {
  mode: 'create' | 'edit'
  orderId?: number
  initial: PurchaseInOrder | null
  onCancel: () => void
  onSaved: (id: number) => void
}

function PurchaseOrderFormInner({
  mode,
  orderId,
  initial,
  onCancel,
  onSaved,
}: InnerProps) {
  const invQuery = useIngredientInventoriesQuery(invListParams)
  const inventories = invQuery.data?.results ?? []

  const [supplierName, setSupplierName] = useState(() => initial?.supplier_name ?? '')
  const [supplierPhone, setSupplierPhone] = useState(() => initial?.supplier_phone ?? '')
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

  const createMut = useCreatePurchaseInOrderMutation()
  const updateMut = useUpdatePurchaseInOrderMutation(orderId ?? 0)

  function addLine() {
    setLines((rows) => [...rows, { ingredient_inventory: '', quantity: '', unit_cost_idr: '' }])
  }

  function removeLine(idx: number) {
    setLines((rows) => rows.filter((_, i) => i !== idx))
  }

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierName.trim()) {
      alert.error('Validasi', 'Nama supplier wajib diisi.')
      return
    }
    const payloadLines: PurchaseInLineInput[] = []
    for (const row of lines) {
      const iid = row.ingredient_inventory === '' ? NaN : Number(row.ingredient_inventory)
      const qty = row.quantity.trim()
      const cost = row.unit_cost_idr.trim()
      if (!qty || !cost || Number.isNaN(iid) || iid <= 0) {
        alert.error('Validasi', 'Setiap baris harus memiliki bahan, kuantitas, dan harga satuan.')
        return
      }
      payloadLines.push({
        ingredient_inventory: iid,
        quantity: qty,
        unit_cost_idr: Number(cost),
      })
    }
    if (payloadLines.length === 0) {
      alert.error('Validasi', 'Minimal satu baris bahan.')
      return
    }

    const body = {
      supplier_name: supplierName.trim(),
      supplier_phone: supplierPhone.trim(),
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
        alert.success('Berhasil', 'Order pembelian dibuat.')
        onSaved(o.id)
      } else {
        if (!orderId) return
        await updateMut.mutateAsync(body)
        alert.success('Berhasil', 'Order pembelian diperbarui.')
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
          <CardTitle className="text-base">Data supplier & faktur</CardTitle>
          <CardDescription>
            Order pembelian bahan dari supplier. Total dihitung dari baris + pajak.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="po-supplier">Nama supplier</Label>
            <Input
              id="po-supplier"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="po-phone">Telepon supplier</Label>
            <Input
              id="po-phone"
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
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
            <Label htmlFor="po-inv">Nomor faktur supplier</Label>
            <Input
              id="po-inv"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="po-tax">Pajak (IDR)</Label>
            <Input
              id="po-tax"
              inputMode="numeric"
              value={taxAmount}
              onChange={(e) => setTaxAmount(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="po-inv-date">Tanggal faktur</Label>
            <Input
              id="po-inv-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="po-due">Jatuh tempo</Label>
            <Input
              id="po-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="po-notes">Catatan</Label>
            <textarea
              id="po-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={pending}
              rows={3}
              className={cn(
                'border-outline-variant bg-background placeholder:text-muted-foreground min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm outline-none',
                'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]'
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant flex flex-row flex-wrap items-center justify-between gap-2 border-b pb-4">
          <div>
            <CardTitle className="text-base">Baris bahan</CardTitle>
            <CardDescription>Pilih stok bahan, kuantitas, dan harga pokok per satuan.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={pending}>
            Tambah baris
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {invQuery.isLoading ? (
            <p className="text-on-surface-variant text-sm">Memuat daftar stok bahan…</p>
          ) : (
            lines.map((row, idx) => (
              <div
                key={idx}
                className="border-outline-variant grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_minmax(0,7rem)_minmax(0,9rem)_auto]"
              >
                <div className="grid gap-1">
                  <Label className="text-xs">Bahan (stok)</Label>
                  <Select
                    value={row.ingredient_inventory === '' ? '' : String(row.ingredient_inventory)}
                    onValueChange={(v) =>
                      updateLine(idx, { ingredient_inventory: v ? Number(v) : '' })
                    }
                    disabled={pending}
                  >
                    <SelectTrigger className="border-outline-variant w-full">
                      <SelectValue placeholder="Pilih bahan…" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventories.map((inv) => (
                        <SelectItem key={inv.id} value={String(inv.id)}>
                          {inv.ingredient_name} — sisa {inv.remaining_stock}
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
                  <Label className="text-xs">Harga satuan (IDR)</Label>
                  <Input
                    inputMode="numeric"
                    value={row.unit_cost_idr}
                    onChange={(e) => updateLine(idx, { unit_cost_idr: e.target.value })}
                    disabled={pending}
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
        <Button type="submit" disabled={pending || invQuery.isLoading}>
          {pending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}

function PurchaseOrderEditGate({
  orderId,
  onCancel,
  onSaved,
}: {
  orderId: number
  onCancel: () => void
  onSaved: (id: number) => void
}) {
  const { data: existing, isLoading } = usePurchaseInOrderQuery(orderId)

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
          to={`/admin/pesanan/pembelian/${orderId}`}
          className="text-primary font-medium underline underline-offset-2"
        >
          Kembali ke detail
        </Link>
      </p>
    )
  }

  return (
    <PurchaseOrderFormInner
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

export function PurchaseOrderForm({ mode, orderId, onCancel, onSaved }: Props) {
  if (mode === 'create') {
    return (
      <PurchaseOrderFormInner
        mode="create"
        initial={null}
        onCancel={onCancel}
        onSaved={onSaved}
      />
    )
  }

  if (!orderId) {
    return <p className="text-destructive text-sm">ID order tidak valid.</p>
  }

  return (
    <PurchaseOrderEditGate orderId={orderId} onCancel={onCancel} onSaved={onSaved} />
  )
}
