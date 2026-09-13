import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'

import {
  createKupasRecord,
  deleteKupasRecord,
  fetchEmployeeCompensationTable,
  fetchKupasItems,
  fetchKupasRecords,
  patchKupasRecord,
} from '@/api/payroll'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { alert } from '@/lib/alert'
import { formatKg, formatKgAmount } from '@/lib/format-kg'
import { formatIdr } from '@/lib/format-idr'
import { toIsoDateOnly } from '@/lib/payroll-week'
import type { KupasItem, KupasProductionRecord, PayrollCompensationTableRow } from '@/types/payroll'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

const LIST_PATH = '/admin/gaji'

type CellLine = {
  localKey: string
  recordId?: number
  kg: string
  locked: boolean
}

function cellKey(employeeId: number, itemId: number) {
  return `${employeeId}-${itemId}`
}

function newDraftLine(): CellLine {
  return { localKey: `draft-${crypto.randomUUID()}`, kg: '', locked: false }
}

function recordsToCellLines(records: KupasProductionRecord[]): CellLine[] {
  if (records.length === 0) return [newDraftLine()]
  return records.map((rec) => ({
    localKey: `rec-${rec.id}`,
    recordId: rec.id,
    kg: formatKg(rec.kg),
    locked: rec.paid_in_period != null,
  }))
}

type KupasCellProps = {
  employeeId: number
  item: KupasItem
  workDate: string
  lines: CellLine[]
  disabled?: boolean
  onLinesChange: (employeeId: number, itemId: number, lines: CellLine[]) => void
  onSaved: (employeeId: number, itemId: number, localKey: string, rec: KupasProductionRecord) => void
  onDeleted: (recordId: number) => void
}

function KupasCell({
  employeeId,
  item,
  workDate,
  lines,
  disabled = false,
  onLinesChange,
  onSaved,
  onDeleted,
}: KupasCellProps) {
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inactive = disabled || busy
  const totalKg = lines.reduce((sum, line) => {
    const n = Number(line.kg)
    return Number.isFinite(n) && n > 0 ? sum + n : sum
  }, 0)
  const hasMultiple = lines.filter((l) => l.kg.trim() || l.recordId).length > 1

  function updateLine(localKey: string, kg: string) {
    onLinesChange(
      employeeId,
      item.id,
      lines.map((l) => (l.localKey === localKey ? { ...l, kg } : l))
    )
  }

  function addLine() {
    const line = newDraftLine()
    onLinesChange(employeeId, item.id, [...lines, line])
    requestAnimationFrame(() => {
      const el = rootRef.current?.querySelector<HTMLInputElement>(
        `input[data-line-key="${line.localKey}"]`
      )
      el?.focus()
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
  }

  async function removeLine(line: CellLine) {
    if (line.locked || inactive) return
    if (line.recordId) {
      setBusy(true)
      try {
        await deleteKupasRecord(line.recordId)
        onDeleted(line.recordId)
      } catch (e) {
        alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
        return
      } finally {
        setBusy(false)
      }
    }
    const next = lines.filter((l) => l.localKey !== line.localKey)
    onLinesChange(employeeId, item.id, next.length > 0 ? next : [newDraftLine()])
  }

  async function commitLine(line: CellLine) {
    if (line.locked) return
    const raw = line.kg.trim()
    const n = Number(raw)

    if (!raw || !Number.isFinite(n) || n <= 0) {
      if (line.recordId) await removeLine(line)
      return
    }

    try {
      setBusy(true)
      const rec = line.recordId
        ? await patchKupasRecord(line.recordId, { kg: raw })
        : await createKupasRecord({
            employee: employeeId,
            work_date: workDate,
            kupas_item: item.id,
            kg: raw,
          })
      onSaved(employeeId, item.id, line.localKey, rec)
    } catch (e) {
      alert.error('Gagal menyimpan', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={rootRef} className="flex min-w-[108px] flex-col gap-1 py-1">
      {lines.map((line) => (
        <div key={line.localKey} className="flex items-center gap-0.5">
          <Input
            forceUppercase={false}
            inputMode="decimal"
            data-line-key={line.localKey}
            className="h-8 w-[72px] px-2 text-center text-sm"
            value={line.kg}
            onChange={(e) => updateLine(line.localKey, e.target.value)}
            onBlur={() => void commitLine(line)}
            disabled={inactive || line.locked}
            title={line.locked ? 'Sudah dibayar' : undefined}
            aria-label={`Kg ${item.name}`}
          />
          {!line.locked ? (
            <button
              type="button"
              className="text-on-surface-variant hover:text-destructive flex h-8 w-6 shrink-0 items-center justify-center rounded"
              onClick={() => void removeLine(line)}
              disabled={inactive}
              aria-label="Hapus baris"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      ))}
      {!lines.some((l) => l.locked) ? (
        <button
          type="button"
          className="text-primary hover:bg-primary/5 flex h-7 items-center justify-center gap-0.5 rounded text-xs font-medium"
          onClick={addLine}
          disabled={inactive}
          title="Tambah baris (mis. 101 + 34)"
        >
          <Plus className="size-3.5" />
          Tambah
        </button>
      ) : null}
      {hasMultiple || totalKg > 0 ? (
        <div className="text-on-surface-variant text-center text-[10px] tabular-nums">
          {hasMultiple ? `Σ ${formatKgAmount(totalKg)} kg` : null}
        </div>
      ) : null}
    </div>
  )
}

export function AdminPayrollKupasEntryPage() {
  const [workDate, setWorkDate] = useState(() => toIsoDateOnly(new Date()))
  const [kupasWorkers, setKupasWorkers] = useState<PayrollCompensationTableRow[]>([])
  const [kupasItems, setKupasItems] = useState<KupasItem[]>([])
  const [records, setRecords] = useState<KupasProductionRecord[]>([])
  const [cellLines, setCellLines] = useState<Record<string, CellLine[]>>({})
  const [loading, setLoading] = useState(true)

  const loadMeta = useCallback(async () => {
    try {
      const [table, items] = await Promise.all([
        fetchEmployeeCompensationTable(),
        fetchKupasItems(true),
      ])
      setKupasWorkers(table.filter((r) => r.pay_type === 'PIECE_RATE'))
      setKupasItems(items)
    } catch (e) {
      alert.error('Data kupas', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    }
  }, [])

  const buildCellLinesFromRecords = useCallback(
    (list: KupasProductionRecord[], workers: PayrollCompensationTableRow[], items: KupasItem[]) => {
      const grouped = new Map<string, KupasProductionRecord[]>()
      for (const rec of list) {
        const k = cellKey(rec.employee, rec.kupas_item)
        const arr = grouped.get(k) ?? []
        arr.push(rec)
        grouped.set(k, arr)
      }
      const next: Record<string, CellLine[]> = {}
      for (const worker of workers) {
        for (const item of items) {
          const k = cellKey(worker.user_id, item.id)
          const recs = grouped.get(k) ?? []
          recs.sort((a, b) => a.id - b.id)
          next[k] = recordsToCellLines(recs)
        }
      }
      return next
    },
    []
  )

  const loadRecords = useCallback(async () => {
    if (!workDate) return
    setLoading(true)
    try {
      const list = await fetchKupasRecords({ work_date: workDate })
      setRecords(list)
      setCellLines(buildCellLinesFromRecords(list, kupasWorkers, kupasItems))
    } catch (e) {
      alert.error('Catatan kupas', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }, [workDate, kupasWorkers, kupasItems, buildCellLinesFromRecords])

  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  useEffect(() => {
    if (kupasWorkers.length > 0 && kupasItems.length > 0) {
      void loadRecords()
    }
  }, [loadRecords, kupasWorkers.length, kupasItems.length])

  function handleLinesChange(employeeId: number, itemId: number, lines: CellLine[]) {
    const k = cellKey(employeeId, itemId)
    setCellLines((prev) => ({ ...prev, [k]: lines }))
  }

  function handleSaved(
    employeeId: number,
    itemId: number,
    localKey: string,
    rec: KupasProductionRecord
  ) {
    const k = cellKey(employeeId, itemId)
    setCellLines((prev) => ({
      ...prev,
      [k]: (prev[k] ?? []).map((line) =>
        line.localKey === localKey
          ? {
              ...line,
              recordId: rec.id,
              kg: formatKg(rec.kg),
              locked: rec.paid_in_period != null,
            }
          : line
      ),
    }))
    setRecords((prev) => {
      const idx = prev.findIndex((row) => row.id === rec.id)
      if (idx === -1) return [...prev, rec]
      const next = [...prev]
      next[idx] = rec
      return next
    })
  }

  function handleDeleted(recordId: number) {
    setRecords((prev) => prev.filter((row) => row.id !== recordId))
  }

  const dayTotalKg = useMemo(
    () => records.reduce((sum, r) => sum + Number(r.kg), 0),
    [records]
  )

  const initialLoad = loading && kupasWorkers.length === 0 && kupasItems.length === 0

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke periode payroll</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Input hasil kupas harian
        </h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl text-sm leading-relaxed">
          Isi kg per pekerja per jenis. Gulir di dalam tabel ke kanan atau bawah — header dan nama
          pekerja tetap terlihat. <strong>Tambah</strong> di sel yang sama untuk beberapa kali kupas
          (mis. 101 + 34 kg).
        </p>
      </div>

      <div className="bg-surface-app sticky top-0 z-10 flex flex-col gap-3 pb-1">
        <div className="border-outline-variant flex flex-wrap items-end gap-4 rounded-xl border p-4">
          <div className="space-y-1.5">
            <Label htmlFor="kupas-date">Tanggal kerja</Label>
            <DatePickerInput id="kupas-date" value={workDate} onChange={setWorkDate} disabled={loading} />
          </div>
          <p className="text-on-surface-variant text-sm">
            Total tercatat: <strong>{formatKgAmount(dayTotalKg, true)}</strong>
          </p>
        </div>

        {initialLoad ? (
          <p className="text-on-surface-variant text-sm">Memuat…</p>
        ) : kupasWorkers.length === 0 ? (
          <p className="text-on-surface-variant text-sm">
            Belum ada pegawai bertipe borongan kupas. Atur di halaman kompensasi.
          </p>
        ) : kupasItems.length === 0 ? (
          <p className="text-on-surface-variant text-sm">
            Belum ada jenis kupas. Tambahkan di halaman Jenis Kupas.
          </p>
        ) : (
          <div className="border-outline-variant bg-surface-container-lowest max-h-[calc(100dvh-22rem)] min-h-[16rem] overflow-auto rounded-xl border lg:max-h-[calc(100dvh-24rem)]">
          <table className="bg-surface-container-lowest w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="sticky top-0 left-0 z-30 min-w-[10rem] border-r border-outline-variant"
                >
                  Pekerja
                </TableHead>
                {kupasItems.map((item) => (
                  <TableHead
                    key={item.id}
                    className="sticky top-0 z-20 min-w-[108px] text-center text-xs"
                  >
                    <div>{item.name}</div>
                    <div className="text-on-surface-variant font-normal">
                      {formatIdr(item.rate_per_kg_idr)}/kg
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {kupasWorkers.map((worker) => (
                <TableRow key={worker.user_id}>
                  <TableCell className="sticky left-0 z-10 min-w-[10rem] border-r border-outline-variant font-medium whitespace-nowrap">
                    {worker.full_name}
                  </TableCell>
                  {kupasItems.map((item) => {
                    const k = cellKey(worker.user_id, item.id)
                    const lines = cellLines[k] ?? [newDraftLine()]
                    return (
                      <TableCell key={item.id} className="align-top p-1">
                        <KupasCell
                          employeeId={worker.user_id}
                          item={item}
                          workDate={workDate}
                          lines={lines}
                          disabled={loading}
                          onLinesChange={handleLinesChange}
                          onSaved={handleSaved}
                          onDeleted={handleDeleted}
                        />
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
