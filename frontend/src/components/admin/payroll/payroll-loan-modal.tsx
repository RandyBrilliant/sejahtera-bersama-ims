import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
  createPayrollEntryLoan,
  deletePayrollEntryLoan,
  fetchPayrollEntryLoans,
  patchPayrollEntryLoan,
} from '@/api/payroll'
import { Button } from '@/components/ui/button'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { PAYMENT_METHOD_LABEL } from '@/constants/expenses'
import { expensesKeys } from '@/hooks/use-expenses-query'
import { alert } from '@/lib/alert'
import { formatIdr, toFiniteNumber } from '@/lib/format-idr'
import type { PayrollEntryRow, PayrollLoanItem } from '@/types/payroll'
import { isAxiosError } from 'axios'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  periodId: number
  payDate: string
  entry: PayrollEntryRow | null
  canEdit: boolean
  onEntryUpdated: (entry: PayrollEntryRow) => void
}

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

export function PayrollLoanModal({
  open,
  onOpenChange,
  periodId,
  payDate,
  entry,
  canEdit,
  onEntryUpdated,
}: Props) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<PayrollLoanItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState(payDate)
  const [method, setMethod] = useState<'CASH' | 'TRANSFER'>('CASH')
  const [note, setNote] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !entry) return
    setAmount('')
    setOccurredOn(payDate)
    setMethod('CASH')
    setNote('')
    setEditingId(null)
    setLoading(true)
    void fetchPayrollEntryLoans(periodId, entry.id)
      .then(setItems)
      .catch((err) => {
        setItems([])
        alert.error('Gagal memuat pinjaman', axiosDetail(err) ?? 'Coba lagi.')
      })
      .finally(() => setLoading(false))
  }, [open, entry, periodId, payDate])

  function applyEntry(next: PayrollEntryRow) {
    onEntryUpdated(next)
    void queryClient.invalidateQueries({ queryKey: expensesKeys.all })
  }

  async function handleSaveNew() {
    if (!entry) return
    const n = Number(String(amount).replace(/\s/g, '').replace(',', '.'))
    if (!Number.isFinite(n) || n < 1) {
      alert.error('Validasi', 'Nominal pinjaman minimal Rp 1.')
      return
    }
    if (!occurredOn) {
      alert.error('Validasi', 'Tanggal pinjaman wajib diisi.')
      return
    }
    setBusy(true)
    try {
      const result = await createPayrollEntryLoan(periodId, entry.id, {
        amount_idr: n,
        occurred_on: occurredOn,
        payment_method: method,
        note: note.trim() || undefined,
      })
      setItems((prev) => [...prev, result.loan])
      applyEntry(result.entry)
      setAmount('')
      setNote('')
      alert.success('Pinjaman ditambah', 'Sudah dipotong dari slip dan dicatat ke kas operasional.')
    } catch (err) {
      alert.error('Gagal menambah', axiosDetail(err) ?? 'Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveEdit(item: PayrollLoanItem) {
    if (!entry) return
    const n = Number(String(amount).replace(/\s/g, '').replace(',', '.'))
    if (!Number.isFinite(n) || n < 1) {
      alert.error('Validasi', 'Nominal pinjaman minimal Rp 1.')
      return
    }
    setBusy(true)
    try {
      const result = await patchPayrollEntryLoan(periodId, entry.id, item.id, {
        amount_idr: n,
        occurred_on: occurredOn,
        payment_method: method,
        note: note.trim(),
      })
      setItems((prev) => prev.map((x) => (x.id === result.loan.id ? result.loan : x)))
      applyEntry(result.entry)
      setEditingId(null)
      setAmount('')
      setNote('')
      alert.success('Pinjaman diperbarui.')
    } catch (err) {
      alert.error('Gagal menyimpan', axiosDetail(err) ?? 'Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(item: PayrollLoanItem) {
    if (!entry) return
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(`Hapus pinjaman ${formatIdr(item.amount_idr)}? Entri kas terkait juga dihapus.`)
        : false
    if (!ok) return
    setBusy(true)
    try {
      const nextEntry = await deletePayrollEntryLoan(periodId, entry.id, item.id)
      setItems((prev) => prev.filter((x) => x.id !== item.id))
      applyEntry(nextEntry)
      if (editingId === item.id) {
        setEditingId(null)
        setAmount('')
        setNote('')
      }
      alert.success('Pinjaman dihapus.')
    } catch (err) {
      alert.error('Gagal menghapus', axiosDetail(err) ?? 'Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  function startEdit(item: PayrollLoanItem) {
    setEditingId(item.id)
    setAmount(String(item.amount_idr))
    setOccurredOn(item.occurred_on)
    setMethod(item.payment_method)
    setNote(item.note ?? '')
  }

  const total = items.reduce((acc, row) => acc + toFiniteNumber(row.amount_idr), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-outline-variant bg-card max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pinjaman — {entry?.employee_name ?? 'pegawai'}</DialogTitle>
          <DialogDescription>
            Bisa lebih dari satu pinjaman. Setiap baris dipotong dari gaji bersih dan dicatat sebagai
            pengeluaran kas (Pinjaman karyawan).
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-on-surface-variant text-sm">Memuat…</p>
        ) : (
          <div className="space-y-4">
            {items.length === 0 ? (
              <p className="text-on-surface-variant text-sm">Belum ada pinjaman untuk pegawai ini.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="border-outline-variant flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-on-surface text-sm font-medium tabular-nums">
                        {formatIdr(item.amount_idr)}
                      </p>
                      <p className="text-on-surface-variant text-xs">
                        {item.occurred_on} · {PAYMENT_METHOD_LABEL[item.payment_method]}
                        {item.note ? ` · ${item.note}` : ''}
                        {item.cash_entry_id ? ' · kas' : ''}
                      </p>
                    </div>
                    {canEdit ? (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => startEdit(item)}
                        >
                          Ubah
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          disabled={busy}
                          onClick={() => void handleDelete(item)}
                        >
                          Hapus
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-on-surface text-sm font-medium">
              Total pinjaman: <span className="tabular-nums">{formatIdr(total)}</span>
            </p>

            {canEdit ? (
              <div className="border-outline-variant space-y-3 rounded-lg border p-3">
                <p className="text-on-surface text-sm font-medium">
                  {editingId ? 'Ubah pinjaman' : 'Tambah pinjaman'}
                </p>
                <div className="grid gap-2">
                  <Label htmlFor="loan-amount">Nominal (IDR)</Label>
                  <Input
                    id="loan-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={busy}
                    className="border-outline-variant"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tanggal</Label>
                  <DatePickerInput
                    value={occurredOn}
                    onChange={setOccurredOn}
                    disabled={busy}
                    ariaLabel="Tanggal pinjaman"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Metode</Label>
                  <Select
                    value={method}
                    onValueChange={(v) => setMethod(v as 'CASH' | 'TRANSFER')}
                    disabled={busy}
                  >
                    <SelectTrigger className="border-outline-variant w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">{PAYMENT_METHOD_LABEL.CASH}</SelectItem>
                      <SelectItem value="TRANSFER">{PAYMENT_METHOD_LABEL.TRANSFER}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="loan-note">Catatan (opsional)</Label>
                  <Input
                    id="loan-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={busy}
                    forceUppercase={false}
                    className="border-outline-variant"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingId ? (
                    <>
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const item = items.find((x) => x.id === editingId)
                          if (item) void handleSaveEdit(item)
                        }}
                      >
                        Simpan perubahan
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setEditingId(null)
                          setAmount('')
                          setNote('')
                          setOccurredOn(payDate)
                        }}
                      >
                        Batal
                      </Button>
                    </>
                  ) : (
                    <Button type="button" disabled={busy} onClick={() => void handleSaveNew()}>
                      Tambah pinjaman
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
