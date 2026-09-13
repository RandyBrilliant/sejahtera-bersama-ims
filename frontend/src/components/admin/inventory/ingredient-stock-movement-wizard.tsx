import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

import { parseInventoryMutationError } from '@/components/admin/inventory/inventory-mutation-error'
import {
  qtyApiToDisplay,
  ShopFloorQuantityDialog,
} from '@/components/admin/inventory/shop-floor-numpad'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { STOCK_UNIT_LABEL } from '@/constants/stock-units'
import {
  useCreateIngredientStockMovementsBulkMutation,
  useIngredientInventoriesQuery,
} from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import { datetimeLocalValueToIso } from '@/lib/datetime-local'
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import type { IngredientInventory, StockMovementType } from '@/types/inventory'

const listParams = { page: 1, page_size: 500 } as const

const STEPS = [
  { id: 0, label: 'Jenis' },
  { id: 1, label: 'Bahan' },
  { id: 2, label: 'Simpan' },
] as const

type MovementLine = {
  key: string
  ingredient_inventory: number
  quantity: string
  unit_cost_idr: string
}

type QtyTarget =
  | { kind: 'qty'; key: string; inventoryId: number }
  | { kind: 'cost'; key: string; inventoryId: number }

function newKey() {
  return crypto.randomUUID()
}

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtQty(raw: string | number) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return String(raw)
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 })
}

function fmtDateLong(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function shortUnit(unit: string) {
  if (unit === 'KG') return 'kg'
  if (unit === 'L') return 'L'
  if (unit === 'PCS') return 'pcs'
  return STOCK_UNIT_LABEL[unit as keyof typeof STOCK_UNIT_LABEL] ?? unit
}

function dateToMovementIso(isoDate: string) {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return datetimeLocalValueToIso(
    `${isoDate}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  )
}

type Props = {
  onCancel: () => void
  onSaved: () => void
}

export function IngredientStockMovementWizard({ onCancel, onSaved }: Props) {
  const { data: invPage, isLoading } = useIngredientInventoriesQuery(listParams)
  const inventories = invPage?.results ?? []

  const [step, setStep] = useState(0)
  const [movementType, setMovementType] = useState<StockMovementType>('IN')
  const [movementDate, setMovementDate] = useState(todayIso)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [lines, setLines] = useState<MovementLine[]>([])
  const [qtyTarget, setQtyTarget] = useState<QtyTarget | null>(null)

  const mutation = useCreateIngredientStockMovementsBulkMutation()
  const pending = mutation.isPending
  const isReceipt = movementType === 'IN'

  const inventoryById = useMemo(() => {
    const map = new Map<number, IngredientInventory>()
    for (const row of inventories) map.set(row.id, row)
    return map
  }, [inventories])

  const selectedIds = useMemo(
    () => new Set(lines.map((l) => l.ingredient_inventory)),
    [lines]
  )
  const availableIngredients = inventories.filter((r) => !selectedIds.has(r.id))

  function openIngredientQty(inventoryId: number) {
    const existing = lines.find((l) => l.ingredient_inventory === inventoryId)
    if (existing) {
      setQtyTarget({ kind: 'qty', key: existing.key, inventoryId })
      return
    }
    const key = newKey()
    setLines((rows) => [
      ...rows,
      {
        key,
        ingredient_inventory: inventoryId,
        quantity: '',
        unit_cost_idr: '',
      },
    ])
    setQtyTarget({ kind: 'qty', key, inventoryId })
  }

  function handleQtyConfirm(apiValue: string) {
    if (!qtyTarget) return

    if (qtyTarget.kind === 'qty') {
      const inv = inventoryById.get(qtyTarget.inventoryId)
      if (!isReceipt && inv && Number(apiValue) > Number(inv.remaining_stock)) {
        alert.error(
          'Stok tidak cukup',
          `Sisa hanya ${fmtQty(inv.remaining_stock)} ${shortUnit(inv.ingredient_unit)}.`
        )
        return
      }
      setLines((rows) =>
        rows.map((r) => (r.key === qtyTarget.key ? { ...r, quantity: apiValue } : r))
      )
      if (isReceipt) {
        setQtyTarget({
          kind: 'cost',
          key: qtyTarget.key,
          inventoryId: qtyTarget.inventoryId,
        })
        return
      }
      setQtyTarget(null)
      return
    }

    setLines((rows) =>
      rows.map((r) => (r.key === qtyTarget.key ? { ...r, unit_cost_idr: apiValue } : r))
    )
    setQtyTarget(null)
  }

  function removeLine(key: string) {
    setLines((rows) => rows.filter((r) => r.key !== key))
  }

  function goNext() {
    if (step === 0) {
      if (!movementDate) {
        alert.error('Belum lengkap', 'Pilih tanggal.')
        return
      }
      setStep(1)
      return
    }
    if (step === 1) {
      const valid = lines.filter((l) => {
        if (!l.quantity || Number(l.quantity) <= 0) return false
        if (isReceipt && (!l.unit_cost_idr || Number(l.unit_cost_idr) <= 0)) return false
        return true
      })
      if (valid.length === 0) {
        alert.error(
          'Belum lengkap',
          isReceipt
            ? 'Pilih minimal 1 bahan, isi jumlah, dan harga satuan.'
            : 'Pilih minimal 1 bahan dan isi jumlahnya.'
        )
        return
      }
      setLines(valid)
      setStep(2)
    }
  }

  function goBack() {
    if (step === 0) {
      onCancel()
      return
    }
    setStep((s) => s - 1)
  }

  async function handleSave() {
    const valid = lines.filter((l) => l.quantity && Number(l.quantity) > 0)
    if (valid.length === 0) {
      alert.error('Belum lengkap', 'Pilih minimal 1 bahan.')
      setStep(1)
      return
    }

    const defaultNote = isReceipt ? 'PENERIMAAN BAHAN' : 'PENGELUARAN BAHAN'
    const movementAt = dateToMovementIso(movementDate)

    try {
      await mutation.mutateAsync(
        valid.map((l) => ({
          ingredient_inventory: l.ingredient_inventory,
          movement_type: movementType,
          quantity: l.quantity,
          unit_cost_idr: isReceipt ? l.unit_cost_idr : undefined,
          note: (note.trim() || defaultNote).toUpperCase(),
          movement_at: movementAt,
        }))
      )
      alert.success(
        'Berhasil',
        isReceipt
          ? 'Penerimaan bahan tersimpan. Stok sudah bertambah.'
          : 'Pengeluaran bahan tersimpan. Stok sudah berkurang.'
      )
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parseInventoryMutationError(err))
    }
  }

  const qtyDialogOpen = qtyTarget != null
  const qtyDialogMeta = (() => {
    if (!qtyTarget) return null
    const inv = inventoryById.get(qtyTarget.inventoryId)
    const line = lines.find((l) => l.key === qtyTarget.key)
    if (qtyTarget.kind === 'qty') {
      return {
        title: isReceipt ? 'Berapa yang diterima?' : 'Berapa yang dikeluarkan?',
        description: inv?.ingredient_name ?? 'Bahan',
        unitLabel: inv ? shortUnit(inv.ingredient_unit) : undefined,
        initialValue: line?.quantity || '',
        allowZero: false,
        confirmLabel: isReceipt ? 'Lanjut' : 'Pakai',
        secondaryLabel: undefined as string | undefined,
        onSecondary: undefined as (() => void) | undefined,
      }
    }
    return {
      title: 'Harga satuan?',
      description: inv
        ? `${inv.ingredient_name} · per ${shortUnit(inv.ingredient_unit)}`
        : 'Harga satuan',
      unitLabel: 'IDR',
      initialValue: line?.unit_cost_idr || '',
      allowZero: false,
      confirmLabel: 'Simpan harga',
      secondaryLabel: undefined as string | undefined,
      onSecondary: undefined as (() => void) | undefined,
    }
  })()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <nav aria-label="Langkah catat penerimaan bahan" className="flex gap-1 sm:gap-2">
        {STEPS.map((s) => {
          const active = s.id === step
          const done = s.id < step
          return (
            <div
              key={s.id}
              className={cn(
                'flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-colors',
                active && 'bg-primary text-primary-foreground',
                done && 'bg-primary/15 text-primary',
                !active && !done && 'bg-surface-container-low text-on-surface-variant'
              )}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  active && 'bg-primary-foreground/20',
                  done && 'bg-primary text-primary-foreground',
                  !active && !done && 'bg-outline-variant/40'
                )}
              >
                {done ? <Check className="size-3.5" /> : s.id + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          )
        })}
      </nav>

      <div className="border-outline-variant bg-surface-container-lowest ambient-shadow rounded-2xl border p-4 sm:p-6">
        {step === 0 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-on-surface font-heading text-xl font-semibold">
                Penerimaan atau pengeluaran?
              </h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                Penerimaan menambah stok (goods receipt). Pengeluaran mengurangi stok (goods issue).
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={pending}
                      onClick={() => {
                        if (movementType === 'IN') return
                        setMovementType('IN')
                        setLines([])
                      }}
                className={cn(
                  'flex min-h-28 flex-col items-start justify-center gap-2 rounded-2xl border p-5 text-left transition-colors',
                  isReceipt
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-outline-variant bg-card text-on-surface active:bg-surface-container-low'
                )}
              >
                <ArrowDownToLine className="size-7" />
                <span className="text-lg font-semibold">Penerimaan</span>
                <span className={cn('text-sm', isReceipt ? 'opacity-90' : 'text-on-surface-variant')}>
                  Bahan masuk ke gudang
                </span>
              </button>
              <button
                type="button"
                disabled={pending}
                      onClick={() => {
                        if (movementType === 'OUT') return
                        setMovementType('OUT')
                        setLines([])
                      }}
                className={cn(
                  'flex min-h-28 flex-col items-start justify-center gap-2 rounded-2xl border p-5 text-left transition-colors',
                  !isReceipt
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-outline-variant bg-card text-on-surface active:bg-surface-container-low'
                )}
              >
                <ArrowUpFromLine className="size-7" />
                <span className="text-lg font-semibold">Pengeluaran</span>
                <span className={cn('text-sm', !isReceipt ? 'opacity-90' : 'text-on-surface-variant')}>
                  Bahan keluar dari gudang
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-on-surface text-sm font-semibold">Tanggal</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DatePickerInput
                  value={movementDate}
                  onChange={setMovementDate}
                  disabled={pending}
                  className="min-h-14 flex-1 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-14 shrink-0 px-5 text-base font-semibold"
                  disabled={pending || movementDate === todayIso()}
                  onClick={() => setMovementDate(todayIso())}
                >
                  Hari ini
                </Button>
              </div>
              {movementDate ? (
                <p className="text-on-surface-variant text-sm">{fmtDateLong(movementDate)}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-on-surface font-heading text-xl font-semibold">
                {isReceipt ? 'Bahan yang diterima' : 'Bahan yang dikeluarkan'}
              </h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                Ketuk bahan, lalu isi jumlah dengan tombol angka
                {isReceipt ? ', kemudian harga satuan.' : '.'}
              </p>
            </div>

            {lines.length > 0 ? (
              <ul className="space-y-2">
                {lines.map((line) => {
                  const inv = inventoryById.get(line.ingredient_inventory)
                  if (!inv) return null
                  return (
                    <li
                      key={line.key}
                      className="border-outline-variant flex items-stretch gap-2 rounded-xl border p-2"
                    >
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => openIngredientQty(line.ingredient_inventory)}
                        className="hover:bg-surface-container-low flex min-h-16 flex-1 flex-col items-start justify-center rounded-lg px-3 text-left"
                      >
                        <span className="text-on-surface text-base font-semibold">
                          {inv.ingredient_name}
                        </span>
                        <span className="text-primary text-lg font-bold tabular-nums">
                          {line.quantity
                            ? `${qtyApiToDisplay(line.quantity)} ${shortUnit(inv.ingredient_unit)}`
                            : 'Ketuk untuk isi jumlah'}
                        </span>
                        {isReceipt && line.unit_cost_idr ? (
                          <span className="text-on-surface-variant text-sm tabular-nums">
                            {formatIdr(line.unit_cost_idr)} / {shortUnit(inv.ingredient_unit)}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => removeLine(line.key)}
                        className="text-destructive hover:bg-destructive/10 flex size-14 shrink-0 items-center justify-center rounded-xl"
                        aria-label={`Hapus ${inv.ingredient_name}`}
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            <div className="space-y-2">
              <p className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
                {lines.length > 0 ? 'Tambah bahan lain' : 'Pilih bahan'}
              </p>
              {isLoading ? (
                <p className="text-on-surface-variant text-sm">Memuat daftar bahan…</p>
              ) : availableIngredients.length === 0 ? (
                <p className="text-on-surface-variant text-sm">
                  {inventories.length === 0
                    ? 'Belum ada stok bahan.'
                    : 'Semua bahan sudah dipilih.'}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {availableIngredients.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      disabled={pending}
                      onClick={() => openIngredientQty(row.id)}
                      className={cn(
                        'border-outline-variant bg-card min-h-20 rounded-xl border p-4 text-left transition-colors',
                        'active:bg-surface-container-low hover:border-primary/40',
                        'flex flex-col justify-center gap-1'
                      )}
                    >
                      <span className="text-on-surface text-base font-semibold leading-snug">
                        {row.ingredient_name}
                      </span>
                      <span className="text-on-surface-variant text-sm tabular-nums">
                        Sisa {fmtQty(row.remaining_stock)} {shortUnit(row.ingredient_unit)}
                      </span>
                      {row.is_below_minimum ? (
                        <span className="text-destructive text-xs font-semibold">
                          Di bawah minimum
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-on-surface font-heading text-xl font-semibold">Periksa dulu</h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                {isReceipt ? 'Penerimaan' : 'Pengeluaran'} · {fmtDateLong(movementDate)}
              </p>
            </div>

            <ul className="space-y-2">
              {lines.map((line) => {
                const inv = inventoryById.get(line.ingredient_inventory)
                return (
                  <li
                    key={line.key}
                    className="border-outline-variant flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                  >
                    <span className="text-on-surface font-medium">
                      {inv?.ingredient_name ?? 'Bahan'}
                    </span>
                    <span className="text-on-surface text-right font-semibold tabular-nums">
                      {qtyApiToDisplay(line.quantity)}{' '}
                      {inv ? shortUnit(inv.ingredient_unit) : ''}
                      {isReceipt && line.unit_cost_idr ? (
                        <span className="text-on-surface-variant block text-sm font-medium">
                          {formatIdr(line.unit_cost_idr)} / {inv ? shortUnit(inv.ingredient_unit) : ''}
                        </span>
                      ) : null}
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="space-y-2">
              {!showNote ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setShowNote(true)}
                  className="text-primary flex min-h-12 items-center gap-2 text-sm font-semibold"
                >
                  <Plus className="size-4" /> Tambah catatan
                </button>
              ) : (
                <div className="space-y-2">
                  <label htmlFor="mov-note" className="text-on-surface text-sm font-semibold">
                    Catatan (opsional)
                  </label>
                  <textarea
                    id="mov-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value.toUpperCase())}
                    disabled={pending}
                    rows={3}
                    placeholder={
                      isReceipt ? 'Contoh: terima dari supplier…' : 'Contoh: afkir / sampel…'
                    }
                    className={cn(
                      'border-outline-variant bg-field placeholder:text-muted-foreground min-h-[88px] w-full rounded-xl border px-4 py-3 text-base uppercase outline-none',
                      'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]',
                      'disabled:pointer-events-none disabled:opacity-50'
                    )}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-14 gap-2 px-6 text-base font-semibold"
          disabled={pending}
          onClick={goBack}
        >
          <ChevronLeft className="size-5" />
          {step === 0 ? 'Batal' : 'Kembali'}
        </Button>

        {step < 2 ? (
          <Button
            type="button"
            size="lg"
            className="min-h-14 gap-2 px-8 text-base font-semibold sm:min-w-[12rem]"
            disabled={pending || isLoading}
            onClick={goNext}
          >
            Lanjut
            <ChevronRight className="size-5" />
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="min-h-14 gap-2 px-8 text-base font-semibold sm:min-w-[14rem]"
            disabled={pending || isLoading}
            onClick={() => void handleSave()}
          >
            {pending ? 'Menyimpan…' : isReceipt ? 'Simpan penerimaan' : 'Simpan pengeluaran'}
          </Button>
        )}
      </div>

      {qtyDialogMeta ? (
        <ShopFloorQuantityDialog
          open={qtyDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              if (qtyTarget?.kind === 'qty') {
                setLines((rows) =>
                  rows.filter(
                    (r) =>
                      r.key !== qtyTarget.key || (r.quantity && Number(r.quantity) > 0)
                  )
                )
              }
              if (qtyTarget?.kind === 'cost') {
                setLines((rows) =>
                  rows.filter(
                    (r) =>
                      r.key !== qtyTarget.key ||
                      (r.unit_cost_idr && Number(r.unit_cost_idr) > 0)
                  )
                )
              }
              setQtyTarget(null)
            }
          }}
          title={qtyDialogMeta.title}
          description={qtyDialogMeta.description}
          unitLabel={qtyDialogMeta.unitLabel}
          initialValue={qtyDialogMeta.initialValue}
          allowZero={qtyDialogMeta.allowZero}
          confirmLabel={qtyDialogMeta.confirmLabel}
          secondaryLabel={qtyDialogMeta.secondaryLabel}
          onSecondary={qtyDialogMeta.onSecondary}
          onConfirm={handleQtyConfirm}
        />
      ) : null}
    </div>
  )
}
