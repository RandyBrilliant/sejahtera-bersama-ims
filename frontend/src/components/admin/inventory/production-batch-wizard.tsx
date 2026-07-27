import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

import { parseInventoryMutationError } from '@/components/admin/inventory/inventory-mutation-error'
import {
  qtyApiToDisplay,
  ShopFloorQuantityDialog,
} from '@/components/admin/inventory/shop-floor-numpad'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { STOCK_UNIT_LABEL } from '@/constants/stock-units'
import {
  useCreateProductionBatchMutation,
  useIngredientInventoriesQuery,
  useProductPackagingListQuery,
} from '@/hooks/use-inventory-query'
import { alert } from '@/lib/alert'
import { cn } from '@/lib/utils'
import type { IngredientInventory, ProductPackaging } from '@/types/inventory'

const listParams = { page: 1, page_size: 500, is_active: true } as const

const STEPS = [
  { id: 0, label: 'Tanggal' },
  { id: 1, label: 'Bahan' },
  { id: 2, label: 'Hasil' },
  { id: 3, label: 'Simpan' },
] as const

const SHIFT_OPTIONS = [
  { value: 'Pagi', label: 'Pagi' },
  { value: 'Siang', label: 'Siang' },
  { value: 'Malam', label: 'Malam' },
] as const

type IngredientLine = {
  key: string
  ingredient_inventory: number
  quantity_used: string
}

type PackagingLine = {
  key: string
  product_packaging: number
  quantity_produced: string
  bonus_quantity: string
}

type QtyTarget =
  | { kind: 'ingredient'; key: string; inventoryId: number }
  | { kind: 'packaging_main'; key: string; packagingId: number }
  | { kind: 'packaging_bonus'; key: string; packagingId: number }

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
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function shortUnit(unit: string) {
  if (unit === 'KG') return 'kg'
  if (unit === 'L') return 'L'
  if (unit === 'PCS') return 'pcs'
  return STOCK_UNIT_LABEL[unit as keyof typeof STOCK_UNIT_LABEL] ?? unit
}

type Props = {
  onCancel: () => void
  onSaved: (batchId: number) => void
}

export function ProductionBatchWizard({ onCancel, onSaved }: Props) {
  const { data: invPage, isLoading: invLoading } = useIngredientInventoriesQuery(listParams)
  const { data: pkgPage, isLoading: pkgLoading } = useProductPackagingListQuery(listParams)
  const inventories = invPage?.results ?? []
  const packagings = pkgPage?.results ?? []

  const [step, setStep] = useState(0)
  const [productionDate, setProductionDate] = useState(todayIso)
  const [shiftLabel, setShiftLabel] = useState('')
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>([])
  const [packagingLines, setPackagingLines] = useState<PackagingLine[]>([])
  const [qtyTarget, setQtyTarget] = useState<QtyTarget | null>(null)

  const mutation = useCreateProductionBatchMutation()
  const pending = mutation.isPending
  const loading = invLoading || pkgLoading

  const inventoryById = useMemo(() => {
    const map = new Map<number, IngredientInventory>()
    for (const row of inventories) map.set(row.id, row)
    return map
  }, [inventories])

  const packagingById = useMemo(() => {
    const map = new Map<number, ProductPackaging>()
    for (const row of packagings) map.set(row.id, row)
    return map
  }, [packagings])

  const selectedIngredientIds = useMemo(
    () => new Set(ingredientLines.map((l) => l.ingredient_inventory)),
    [ingredientLines]
  )
  const selectedPackagingIds = useMemo(
    () => new Set(packagingLines.map((l) => l.product_packaging)),
    [packagingLines]
  )

  const availableIngredients = inventories.filter((r) => !selectedIngredientIds.has(r.id))
  const availablePackagings = packagings.filter((r) => !selectedPackagingIds.has(r.id))

  function openIngredientQty(inventoryId: number) {
    const existing = ingredientLines.find((l) => l.ingredient_inventory === inventoryId)
    if (existing) {
      setQtyTarget({ kind: 'ingredient', key: existing.key, inventoryId })
      return
    }
    const key = newKey()
    setIngredientLines((rows) => [
      ...rows,
      { key, ingredient_inventory: inventoryId, quantity_used: '' },
    ])
    setQtyTarget({ kind: 'ingredient', key, inventoryId })
  }

  function openPackagingQty(packagingId: number) {
    const existing = packagingLines.find((l) => l.product_packaging === packagingId)
    if (existing) {
      setQtyTarget({ kind: 'packaging_main', key: existing.key, packagingId })
      return
    }
    const key = newKey()
    setPackagingLines((rows) => [
      ...rows,
      {
        key,
        product_packaging: packagingId,
        quantity_produced: '',
        bonus_quantity: '0',
      },
    ])
    setQtyTarget({ kind: 'packaging_main', key, packagingId })
  }

  function handleQtyConfirm(apiValue: string) {
    if (!qtyTarget) return

    if (qtyTarget.kind === 'ingredient') {
      const inv = inventoryById.get(qtyTarget.inventoryId)
      if (inv && Number(apiValue) > Number(inv.remaining_stock)) {
        alert.error(
          'Stok tidak cukup',
          `Sisa hanya ${fmtQty(inv.remaining_stock)} ${shortUnit(inv.ingredient_unit)}.`
        )
        return
      }
      setIngredientLines((rows) =>
        rows.map((r) => (r.key === qtyTarget.key ? { ...r, quantity_used: apiValue } : r))
      )
      setQtyTarget(null)
      return
    }

    if (qtyTarget.kind === 'packaging_main') {
      setPackagingLines((rows) =>
        rows.map((r) =>
          r.key === qtyTarget.key ? { ...r, quantity_produced: apiValue } : r
        )
      )
      setQtyTarget({
        kind: 'packaging_bonus',
        key: qtyTarget.key,
        packagingId: qtyTarget.packagingId,
      })
      return
    }

    setPackagingLines((rows) =>
      rows.map((r) => (r.key === qtyTarget.key ? { ...r, bonus_quantity: apiValue } : r))
    )
    setQtyTarget(null)
  }

  function removeIngredient(key: string) {
    setIngredientLines((rows) => rows.filter((r) => r.key !== key))
  }

  function removePackaging(key: string) {
    setPackagingLines((rows) => rows.filter((r) => r.key !== key))
  }

  function goNext() {
    if (step === 0) {
      if (!productionDate) {
        alert.error('Belum lengkap', 'Pilih tanggal produksi.')
        return
      }
      setStep(1)
      return
    }
    if (step === 1) {
      const valid = ingredientLines.filter((l) => l.quantity_used && Number(l.quantity_used) > 0)
      if (valid.length === 0) {
        alert.error('Belum lengkap', 'Pilih minimal 1 bahan dan isi jumlahnya.')
        return
      }
      // Drop incomplete drafts
      setIngredientLines(valid)
      setStep(2)
      return
    }
    if (step === 2) {
      const valid = packagingLines.filter(
        (l) => l.quantity_produced && Number(l.quantity_produced) > 0
      )
      if (valid.length === 0) {
        alert.error('Belum lengkap', 'Pilih minimal 1 kemasan dan isi jumlahnya.')
        return
      }
      setPackagingLines(valid)
      setStep(3)
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
    const usages = ingredientLines
      .filter((l) => l.quantity_used && Number(l.quantity_used) > 0)
      .map((l) => ({
        ingredient_inventory: l.ingredient_inventory,
        quantity_used: l.quantity_used,
      }))
    const outputs = packagingLines
      .filter((l) => l.quantity_produced && Number(l.quantity_produced) > 0)
      .map((l) => ({
        product_packaging: l.product_packaging,
        quantity_produced: l.quantity_produced,
        bonus_quantity: l.bonus_quantity.trim() || '0',
      }))

    if (usages.length === 0) {
      alert.error('Belum lengkap', 'Pilih minimal 1 bahan.')
      setStep(1)
      return
    }
    if (outputs.length === 0) {
      alert.error('Belum lengkap', 'Pilih minimal 1 kemasan.')
      setStep(2)
      return
    }

    try {
      const batch = await mutation.mutateAsync({
        production_date: productionDate,
        shift_label: shiftLabel.trim() || undefined,
        note: note.trim() || undefined,
        ingredient_usages_input: usages,
        packaging_outputs_input: outputs,
      })
      alert.success('Berhasil', 'Produksi tersimpan. Stok sudah diperbarui.')
      onSaved(batch.id)
    } catch (err) {
      alert.error('Gagal menyimpan', parseInventoryMutationError(err))
    }
  }

  const qtyDialogOpen = qtyTarget != null
  const qtyDialogMeta = (() => {
    if (!qtyTarget) return null
    if (qtyTarget.kind === 'ingredient') {
      const inv = inventoryById.get(qtyTarget.inventoryId)
      const line = ingredientLines.find((l) => l.key === qtyTarget.key)
      return {
        title: 'Berapa banyak dipakai?',
        description: inv?.ingredient_name ?? 'Bahan',
        unitLabel: inv ? shortUnit(inv.ingredient_unit) : undefined,
        initialValue: line?.quantity_used || '',
        allowZero: false,
        confirmLabel: 'Pakai',
        secondaryLabel: undefined as string | undefined,
        onSecondary: undefined as (() => void) | undefined,
      }
    }
    if (qtyTarget.kind === 'packaging_main') {
      const pkg = packagingById.get(qtyTarget.packagingId)
      const line = packagingLines.find((l) => l.key === qtyTarget.key)
      return {
        title: 'Berapa hasil utama?',
        description: pkg
          ? `${pkg.product_variant_name} · ${pkg.label}`
          : 'Kemasan',
        unitLabel: 'kemasan',
        initialValue: line?.quantity_produced || '',
        allowZero: false,
        confirmLabel: 'Lanjut',
        secondaryLabel: undefined as string | undefined,
        onSecondary: undefined as (() => void) | undefined,
      }
    }
    const pkg = packagingById.get(qtyTarget.packagingId)
    const line = packagingLines.find((l) => l.key === qtyTarget.key)
    return {
      title: 'Ada bonus?',
      description: pkg
        ? `${pkg.product_variant_name} · ${pkg.label}`
        : 'Kemasan',
      unitLabel: 'kemasan bonus',
      initialValue:
        line?.bonus_quantity && line.bonus_quantity !== '0' ? line.bonus_quantity : '',
      allowZero: true,
      confirmLabel: 'Simpan bonus',
      secondaryLabel: 'Tanpa bonus',
      onSecondary: () => {
        setPackagingLines((rows) =>
          rows.map((r) => (r.key === qtyTarget.key ? { ...r, bonus_quantity: '0' } : r))
        )
        setQtyTarget(null)
      },
    }
  })()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {/* Progress */}
      <nav aria-label="Langkah catat produksi" className="flex gap-1 sm:gap-2">
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

      {/* Step panels */}
      <div className="border-outline-variant bg-surface-container-lowest ambient-shadow rounded-2xl border p-4 sm:p-6">
        {step === 0 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-on-surface font-heading text-xl font-semibold">
                Kapan diproduksi?
              </h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                Tanggal biasanya hari ini. Pilih shift kalau perlu.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-on-surface text-sm font-semibold">Tanggal</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <DatePickerInput
                  value={productionDate}
                  onChange={setProductionDate}
                  disabled={pending}
                  className="min-h-14 flex-1 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-14 shrink-0 px-5 text-base font-semibold"
                  disabled={pending || productionDate === todayIso()}
                  onClick={() => setProductionDate(todayIso())}
                >
                  Hari ini
                </Button>
              </div>
              {productionDate ? (
                <p className="text-on-surface-variant text-sm">{fmtDateLong(productionDate)}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-on-surface text-sm font-semibold">Shift (opsional)</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SHIFT_OPTIONS.map((opt) => {
                  const selected = shiftLabel === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={pending}
                      onClick={() => setShiftLabel(opt.value)}
                      className={cn(
                        'min-h-14 rounded-xl border text-base font-semibold transition-colors',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-outline-variant bg-card text-on-surface active:bg-surface-container-low'
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setShiftLabel('')}
                  className={cn(
                    'min-h-14 rounded-xl border text-base font-semibold transition-colors',
                    !shiftLabel
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-outline-variant bg-card text-on-surface active:bg-surface-container-low'
                  )}
                >
                  Lewati
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-on-surface font-heading text-xl font-semibold">Pakai bahan</h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                Ketuk bahan, lalu isi jumlah dengan tombol angka.
              </p>
            </div>

            {ingredientLines.length > 0 ? (
              <ul className="space-y-2">
                {ingredientLines.map((line) => {
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
                          {line.quantity_used
                            ? `${qtyApiToDisplay(line.quantity_used)} ${shortUnit(inv.ingredient_unit)}`
                            : 'Ketuk untuk isi jumlah'}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => removeIngredient(line.key)}
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
                {ingredientLines.length > 0 ? 'Tambah bahan lain' : 'Pilih bahan'}
              </p>
              {loading ? (
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
                        <span className="text-destructive text-xs font-semibold">Di bawah minimum</span>
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
              <h2 className="text-on-surface font-heading text-xl font-semibold">Hasil jadi</h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                Ketuk kemasan hasil produksi, isi jumlah utama, lalu bonus jika ada.
              </p>
            </div>

            {packagingLines.length > 0 ? (
              <ul className="space-y-2">
                {packagingLines.map((line) => {
                  const pkg = packagingById.get(line.product_packaging)
                  if (!pkg) return null
                  const bonus = Number(line.bonus_quantity) || 0
                  return (
                    <li
                      key={line.key}
                      className="border-outline-variant flex items-stretch gap-2 rounded-xl border p-2"
                    >
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => openPackagingQty(line.product_packaging)}
                        className="hover:bg-surface-container-low flex min-h-16 flex-1 flex-col items-start justify-center rounded-lg px-3 text-left"
                      >
                        <span className="text-on-surface text-base font-semibold">
                          {pkg.product_variant_name} · {pkg.label}
                        </span>
                        <span className="text-primary text-lg font-bold tabular-nums">
                          {line.quantity_produced
                            ? `${qtyApiToDisplay(line.quantity_produced)} kemasan`
                            : 'Ketuk untuk isi jumlah'}
                          {bonus > 0
                            ? ` + bonus ${qtyApiToDisplay(line.bonus_quantity)}`
                            : ''}
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => removePackaging(line.key)}
                        className="text-destructive hover:bg-destructive/10 flex size-14 shrink-0 items-center justify-center rounded-xl"
                        aria-label={`Hapus ${pkg.label}`}
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
                {packagingLines.length > 0 ? 'Tambah kemasan lain' : 'Pilih kemasan'}
              </p>
              {loading ? (
                <p className="text-on-surface-variant text-sm">Memuat daftar kemasan…</p>
              ) : availablePackagings.length === 0 ? (
                <p className="text-on-surface-variant text-sm">
                  {packagings.length === 0
                    ? 'Belum ada kemasan aktif.'
                    : 'Semua kemasan sudah dipilih.'}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {availablePackagings.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      disabled={pending}
                      onClick={() => openPackagingQty(row.id)}
                      className={cn(
                        'border-outline-variant bg-card min-h-20 rounded-xl border p-4 text-left transition-colors',
                        'active:bg-surface-container-low hover:border-primary/40',
                        'flex flex-col justify-center gap-1'
                      )}
                    >
                      <span className="text-on-surface text-base font-semibold leading-snug">
                        {row.product_variant_name}
                      </span>
                      <span className="text-on-surface-variant text-sm">
                        {row.label} · {fmtQty(row.net_mass_kg)} kg
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-on-surface font-heading text-xl font-semibold">Cek dulu</h2>
              <p className="text-on-surface-variant mt-1 text-sm">
                Pastikan sudah benar. Setelah disimpan tidak bisa diubah.
              </p>
            </div>

            <div className="border-outline-variant bg-surface-container-low/50 space-y-1 rounded-xl border p-4">
              <p className="text-on-surface text-base font-semibold">
                {fmtDateLong(productionDate)}
              </p>
              <p className="text-on-surface-variant text-sm">
                {shiftLabel ? `Shift ${shiftLabel}` : 'Tanpa shift'}
              </p>
            </div>

            <section className="space-y-2">
              <h3 className="text-on-surface text-sm font-semibold tracking-wide uppercase">
                Dipakai
              </h3>
              <ul className="space-y-2">
                {ingredientLines.map((line) => {
                  const inv = inventoryById.get(line.ingredient_inventory)
                  return (
                    <li
                      key={line.key}
                      className="border-outline-variant flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    >
                      <span className="text-on-surface font-medium">
                        {inv?.ingredient_name ?? 'Bahan'}
                      </span>
                      <span className="text-on-surface font-semibold tabular-nums">
                        {qtyApiToDisplay(line.quantity_used)}{' '}
                        {inv ? shortUnit(inv.ingredient_unit) : ''}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-on-surface text-sm font-semibold tracking-wide uppercase">
                Dihasilkan
              </h3>
              <ul className="space-y-2">
                {packagingLines.map((line) => {
                  const pkg = packagingById.get(line.product_packaging)
                  const bonus = Number(line.bonus_quantity) || 0
                  return (
                    <li
                      key={line.key}
                      className="border-outline-variant flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    >
                      <span className="text-on-surface font-medium">
                        {pkg
                          ? `${pkg.product_variant_name} · ${pkg.label}`
                          : 'Kemasan'}
                      </span>
                      <span className="text-on-surface text-right font-semibold tabular-nums">
                        {qtyApiToDisplay(line.quantity_produced)}
                        {bonus > 0 ? (
                          <span className="text-on-surface-variant block text-sm font-medium">
                            + bonus {qtyApiToDisplay(line.bonus_quantity)}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>

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
                  <label htmlFor="prod-note" className="text-on-surface text-sm font-semibold">
                    Catatan (opsional)
                  </label>
                  <textarea
                    id="prod-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={pending}
                    rows={3}
                    placeholder="Contoh: produksi sisa kemarin…"
                    className={cn(
                      'border-outline-variant bg-field placeholder:text-muted-foreground min-h-[88px] w-full rounded-xl border px-4 py-3 text-base outline-none',
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

      {/* Footer actions */}
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

        {step < 3 ? (
          <Button
            type="button"
            size="lg"
            className="min-h-14 gap-2 px-8 text-base font-semibold sm:min-w-[12rem]"
            disabled={pending || loading}
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
            disabled={pending || loading}
            onClick={() => void handleSave()}
          >
            {pending ? 'Menyimpan…' : 'Simpan produksi'}
          </Button>
        )}
      </div>

      {qtyDialogMeta ? (
        <ShopFloorQuantityDialog
          open={qtyDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              // If user cancels mid-flow on a brand-new line with empty qty, drop it
              if (qtyTarget?.kind === 'ingredient') {
                setIngredientLines((rows) =>
                  rows.filter(
                    (r) =>
                      r.key !== qtyTarget.key ||
                      (r.quantity_used && Number(r.quantity_used) > 0)
                  )
                )
              }
              if (qtyTarget?.kind === 'packaging_main') {
                setPackagingLines((rows) =>
                  rows.filter(
                    (r) =>
                      r.key !== qtyTarget.key ||
                      (r.quantity_produced && Number(r.quantity_produced) > 0)
                  )
                )
              }
              // packaging_bonus cancel keeps main qty; leave bonus as-is or 0
              if (qtyTarget?.kind === 'packaging_bonus') {
                setPackagingLines((rows) =>
                  rows.map((r) =>
                    r.key === qtyTarget.key
                      ? { ...r, bonus_quantity: r.bonus_quantity || '0' }
                      : r
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

/** @deprecated Prefer ProductionBatchWizard — kept for existing imports. */
export function ProductionBatchForm(props: Props) {
  return <ProductionBatchWizard {...props} />
}
