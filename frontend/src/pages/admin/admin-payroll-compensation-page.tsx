import { PageBackLink } from '@/components/navigation/page-back-link'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  fetchEmployeeCompensationTable,
  patchEmployeeCompensation,
} from '@/api/payroll'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { USER_ROLE_LABEL } from '@/constants/user-roles'
import { useAuth } from '@/hooks/use-auth'
import { alert } from '@/lib/alert'
import { idrToDigits } from '@/lib/format-idr'
import type { PayCadence, PayType, PayrollCompensationTableRow } from '@/types/payroll'
import { PAY_CADENCE_LABEL, PAY_TYPE_LABEL } from '@/types/payroll'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

const LIST_PATH = '/admin/gaji'

type DraftRow = {
  pay_type: PayType
  pay_cadence: PayCadence
  daily_rate_idr: string
  monthly_base_salary_idr: string
}

export function AdminPayrollCompensationPage() {
  const { user } = useAuth()
  const canOpenStaffAccountPage = user?.role === 'ADMIN' || user?.role === 'LEADERSHIP'

  const [rows, setRows] = useState<PayrollCompensationTableRow[]>([])
  const [draft, setDraft] = useState<Record<number, DraftRow>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchEmployeeCompensationTable()
      setRows(list)
      const init: Record<number, DraftRow> = {}
      for (const r of list) {
        init[r.user_id] = {
          pay_type: r.pay_type ?? 'DAILY',
          pay_cadence: r.pay_cadence ?? 'MONTHLY',
          daily_rate_idr: idrToDigits(r.daily_rate_idr),
          monthly_base_salary_idr: idrToDigits(r.monthly_base_salary_idr),
        }
      }
      setDraft(init)
    } catch (e) {
      setRows([])
      alert.error('Kompensasi', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        r.employee_code.toLowerCase().includes(q)
    )
  }, [rows, query])

  async function saveRow(uid: number) {
    const d = draft[uid]
    if (!d) return
    if (d.pay_type === 'DAILY') {
      const hasPokok = d.pay_cadence === 'MONTHLY' && d.monthly_base_salary_idr.trim().length > 0
      const hasDaily = d.daily_rate_idr.trim().length > 0
      if (!hasPokok && !hasDaily) {
        alert.error(
          'Validasi',
          d.pay_cadence === 'MONTHLY'
            ? 'Isi gaji pokok bulanan, atau tarif harian jika pokok dikosongkan.'
            : 'Isi tarif harian untuk pegawai berpresensi.'
        )
        return
      }
    }
    setSavingId(uid)
    try {
      const updated = await patchEmployeeCompensation(uid, {
        pay_type: d.pay_type,
        pay_cadence: d.pay_cadence,
        daily_rate_idr: d.daily_rate_idr || '0',
        monthly_base_salary_idr: d.monthly_base_salary_idr || '0',
      })
      setRows((prev) =>
        prev.map((row) =>
          row.user_id === uid
            ? {
                ...row,
                pay_type: updated.pay_type,
                pay_cadence: updated.pay_cadence,
                daily_rate_idr: idrToDigits(updated.daily_rate_idr),
                monthly_base_salary_idr: idrToDigits(updated.monthly_base_salary_idr),
                compensation_updated_at: updated.updated_at,
              }
            : row
        )
      )
      setDraft((prev) => ({
        ...prev,
        [uid]: {
          pay_type: updated.pay_type,
          pay_cadence: updated.pay_cadence,
          daily_rate_idr: idrToDigits(updated.daily_rate_idr),
          monthly_base_salary_idr: idrToDigits(updated.monthly_base_salary_idr),
        },
      }))
      alert.success('Kompensasi disimpan.')
    } catch (e) {
      alert.error('Gagal menyimpan', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setSavingId(null)
    }
  }

  function isDirty(uid: number) {
    const row = rows.find((r) => r.user_id === uid)
    const d = draft[uid]
    if (!row || !d) return false
    return (
      d.pay_type !== (row.pay_type ?? 'DAILY') ||
      d.pay_cadence !== (row.pay_cadence ?? 'MONTHLY') ||
      d.daily_rate_idr.trim() !== idrToDigits(row.daily_rate_idr) ||
      d.monthly_base_salary_idr.trim() !== idrToDigits(row.monthly_base_salary_idr)
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke periode payroll</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Kompensasi pegawai aktif
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Atur tipe gaji (harian / borongan kupas) dan periode bayar (mingguan / bulanan) per orang.
          Bulanan + harian: isi gaji pokok untuk bruto tetap, atau kosongkan pokok agar pakai tarif
          harian × hadir. Kupas selalu dihitung dari kg × tarif.
        </p>
      </div>

      <div className="border-outline-variant max-w-md space-y-2 rounded-xl border p-4">
        <Label htmlFor="comp-search">Cari nama atau username</Label>
        <Input
          id="comp-search"
          forceUppercase={false}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ketikan untuk menyaring baris…"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      {loading ? (
        <p className="text-on-surface-variant text-sm">Memuat…</p>
      ) : (
        <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Tipe gaji</TableHead>
                <TableHead>Periode bayar</TableHead>
                <TableHead>Tarif harian (IDR)</TableHead>
                <TableHead>Gaji pokok bln (ops.)</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const d = draft[r.user_id]
                const showDaily = d?.pay_type === 'DAILY'
                return (
                  <TableRow key={r.user_id}>
                    <TableCell>
                      <div className="text-on-surface font-medium">{r.full_name}</div>
                      <div className="text-on-surface-variant font-mono text-xs">{r.username}</div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {USER_ROLE_LABEL[r.role as keyof typeof USER_ROLE_LABEL] ?? r.role}
                    </TableCell>
                    <TableCell>
                      <select
                        className="border-input bg-field h-10 rounded-lg border px-2 text-sm"
                        value={d?.pay_type ?? 'DAILY'}
                        disabled={savingId === r.user_id}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [r.user_id]: {
                              ...prev[r.user_id],
                              pay_type: e.target.value as PayType,
                            },
                          }))
                        }
                      >
                        {(Object.keys(PAY_TYPE_LABEL) as PayType[]).map((pt) => (
                          <option key={pt} value={pt}>
                            {PAY_TYPE_LABEL[pt]}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        className="border-input bg-field h-10 rounded-lg border px-2 text-sm"
                        value={d?.pay_cadence ?? 'MONTHLY'}
                        disabled={savingId === r.user_id}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [r.user_id]: {
                              ...prev[r.user_id],
                              pay_cadence: e.target.value as PayCadence,
                            },
                          }))
                        }
                      >
                        {(Object.keys(PAY_CADENCE_LABEL) as PayCadence[]).map((pc) => (
                          <option key={pc} value={pc}>
                            {PAY_CADENCE_LABEL[pc]}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      {showDaily ? (
                        <CurrencyInput
                          className="h-10 min-w-[9rem]"
                          placeholder="Mis. 100.000"
                          value={d.daily_rate_idr}
                          onChange={(daily_rate_idr) =>
                            setDraft((prev) => ({
                              ...prev,
                              [r.user_id]: { ...prev[r.user_id], daily_rate_idr },
                            }))
                          }
                          disabled={savingId === r.user_id}
                        />
                      ) : (
                        <span className="text-on-surface-variant text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CurrencyInput
                        className="h-10 min-w-[9rem]"
                        placeholder="Mis. 5.000.000"
                        value={d?.monthly_base_salary_idr ?? ''}
                        onChange={(monthly_base_salary_idr) =>
                          setDraft((prev) => ({
                            ...prev,
                            [r.user_id]: {
                              ...prev[r.user_id],
                              monthly_base_salary_idr,
                            },
                          }))
                        }
                        disabled={savingId === r.user_id}
                      />
                    </TableCell>
                    <TableCell className="space-y-1 text-right whitespace-nowrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={savingId === r.user_id || !isDirty(r.user_id)}
                        onClick={() => void saveRow(r.user_id)}
                      >
                        {savingId === r.user_id ? 'Menyimpan…' : 'Simpan'}
                      </Button>
                      {canOpenStaffAccountPage ? (
                        <div>
                          <Link
                            to={`/admin/staf/${r.user_id}/edit`}
                            className="text-primary text-xs font-semibold underline"
                          >
                            Buka formulir pegawai
                          </Link>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && filtered.length === 0 ? (
        <p className="text-on-surface-variant text-sm">
          Tidak ada baris yang cocok atau belum ada staf aktif.
        </p>
      ) : null}
    </div>
  )
}
