import { PageBackLink } from '@/components/navigation/page-back-link'
import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  fetchEmployeeCompensationTable,
  patchEmployeeCompensation,
} from '@/api/payroll'
import { Button } from '@/components/ui/button'
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
import type { PayType, PayrollCompensationTableRow } from '@/types/payroll'
import { PAY_TYPE_LABEL } from '@/types/payroll'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

const LIST_PATH = '/admin/gaji'

type DraftRow = {
  pay_type: PayType
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
          daily_rate_idr: r.daily_rate_idr != null ? String(r.daily_rate_idr) : '',
          monthly_base_salary_idr:
            r.monthly_base_salary_idr != null ? String(r.monthly_base_salary_idr) : '',
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
    if (d.pay_type === 'DAILY' && !d.daily_rate_idr.trim()) {
      alert.error('Validasi', 'Isi tarif harian untuk pegawai presensi.')
      return
    }
    setSavingId(uid)
    try {
      const updated = await patchEmployeeCompensation(uid, {
        pay_type: d.pay_type,
        daily_rate_idr: d.pay_type === 'DAILY' ? d.daily_rate_idr : '0',
        monthly_base_salary_idr: d.monthly_base_salary_idr || '0',
      })
      setRows((prev) =>
        prev.map((row) =>
          row.user_id === uid
            ? {
                ...row,
                pay_type: updated.pay_type,
                daily_rate_idr: String(updated.daily_rate_idr),
                monthly_base_salary_idr: String(updated.monthly_base_salary_idr),
                compensation_updated_at: updated.updated_at,
              }
            : row
        )
      )
      setDraft((prev) => ({
        ...prev,
        [uid]: {
          pay_type: updated.pay_type,
          daily_rate_idr: String(updated.daily_rate_idr),
          monthly_base_salary_idr: String(updated.monthly_base_salary_idr),
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
      d.daily_rate_idr.trim() !== (row.daily_rate_idr != null ? String(row.daily_rate_idr).trim() : '') ||
      d.monthly_base_salary_idr.trim() !==
        (row.monthly_base_salary_idr != null ? String(row.monthly_base_salary_idr).trim() : '')
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
          Atur tipe gaji: <strong>harian (presensi)</strong> dengan tarif per hari, atau{' '}
          <strong>borongan kupas</strong> (tanpa presensi, dibayar per kg). Satu pegawai hanya bisa
          salah satu tipe.
        </p>
      </div>

      <div className="border-outline-variant max-w-md space-y-2 rounded-xl border p-4">
        <Label htmlFor="comp-search">Cari nama atau username</Label>
        <Input
          id="comp-search"
          forceUppercase={false}
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
                <TableHead>Tarif harian (IDR)</TableHead>
                <TableHead>Gaji pokok bln (ref.)</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const d = draft[r.user_id]
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
                      {d?.pay_type === 'DAILY' ? (
                        <Input
                          forceUppercase={false}
                          inputMode="decimal"
                          className="h-10 min-w-[9rem]"
                          value={d.daily_rate_idr}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              [r.user_id]: { ...prev[r.user_id], daily_rate_idr: e.target.value },
                            }))
                          }
                          disabled={savingId === r.user_id}
                        />
                      ) : (
                        <span className="text-on-surface-variant text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        forceUppercase={false}
                        inputMode="decimal"
                        className="h-10 min-w-[9rem]"
                        value={d?.monthly_base_salary_idr ?? ''}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            [r.user_id]: {
                              ...prev[r.user_id],
                              monthly_base_salary_idr: e.target.value,
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
