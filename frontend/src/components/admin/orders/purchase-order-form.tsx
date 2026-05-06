import { useState } from 'react'
import { Link } from 'react-router-dom'

import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyInput } from '@/components/ui/currency-input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
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
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import { useIngredientInventoriesQuery } from '@/hooks/use-inventory-query'
import {
  useCreatePurchaseInOrderMutation,
  usePurchaseInOrderQuery,
  useUpdatePurchaseInOrderMutation,
} from '@/hooks/use-purchase-query'
import { canEditOrderLines } from '@/constants/order-status'
import type { PurchaseInLineInput, PurchaseInOrder } from '@/types/purchase'

const invListParams = { page: 1, page_size: 500 } as const

function isoTomorrowLocal(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function defaultPurchaseInvoiceNumber(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `INV-PI-${yyyy}${mm}${dd}-${hh}${mi}${ss}`
}

function fmtQty(raw: string | number) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return String(raw)
  if (Number.isInteger(n)) return String(n)
  return n
    .toLocaleString('id-ID', { maximumFractionDigits: 3 })
    .replace(/0+$/, '')
    .replace(/,$/, '')
}

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

  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    if (initial?.invoice_number) return initial.invoice_number
    return mode === 'create' ? defaultPurchaseInvoiceNumber() : ''
  })
  const [invoiceDate, setInvoiceDate] = useState(() =>
    initial?.invoice_date ? initial.invoice_date.slice(0, 10) : isoTomorrowLocal()
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

  function toFiniteNumber(value: string): number | null {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
      invoice_number: invoiceNumber.trim() || undefined,
      invoice_date: invoiceDate || null,
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
          <CardTitle className="text-base">Data faktur</CardTitle>
          <CardDescription>Nomor faktur otomatis dibuat namun tetap bisa diubah manual.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="po-inv">Nomor faktur</Label>
            <Input
              id="po-inv"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              disabled={pending}
              className="border-outline-variant"
              placeholder="Otomatis dibuat, bisa diubah manual"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="po-inv-date">Tanggal faktur</Label>
            <DatePickerInput
              id="po-inv-date"
              value={invoiceDate}
              onChange={setInvoiceDate}
              disabled={pending}
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
              (() => {
                const qty = toFiniteNumber(row.quantity)
                const unitCost = toFiniteNumber(row.unit_cost_idr)
                const showSubtotal = qty !== null && unitCost !== null && qty > 0 && unitCost >= 0
                const selectedInventory = inventories.find((inv) => inv.id === row.ingredient_inventory)
                const quantityLabel = selectedInventory
                  ? `Kuantitas (${selectedInventory.ingredient_unit})`
                  : 'Kuantitas'

                return (
                  <div key={idx} className="border-outline-variant bg-background space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="bg-surface-container text-on-surface-variant rounded-md px-2 py-0.5 text-xs font-medium">
                          Baris {idx + 1}
                        </span>
                        <span className="text-on-surface-variant text-xs">
                          {showSubtotal
                            ? `Subtotal: ${formatIdr((qty as number) * (unitCost as number))}`
                            : 'Subtotal: isi kuantitas & harga'}
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
                                {inv.ingredient_name} — sisa {fmtQty(inv.remaining_stock)} {inv.ingredient_unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1 md:col-span-2">
                        <Label className="text-xs">{quantityLabel}</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={row.quantity}
                          onChange={(e) =>
                            updateLine(idx, { quantity: e.target.value.replace(/[^0-9.]/g, '') })
                          }
                          disabled={pending}
                          className="border-outline-variant"
                          min="0"
                          step="any"
                          placeholder="0"
                        />
                      </div>

                      <div className="grid gap-1 md:col-span-3">
                        <Label className="text-xs">Harga satuan (IDR)</Label>
                        <CurrencyInput
                          value={row.unit_cost_idr}
                          onChange={(v) => updateLine(idx, { unit_cost_idr: v })}
                          disabled={pending}
                          className="border-outline-variant"
                          placeholder="0"
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
