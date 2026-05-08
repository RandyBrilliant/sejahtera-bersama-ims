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
import type { PayrollCompensationTableRow } from '@/types/payroll'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

export function AdminPayrollCompensationPage() {
  const { user } = useAuth()
  const canOpenStaffAccountPage = user?.role === 'ADMIN' || user?.role === 'LEADERSHIP'

  const [rows, setRows] = useState<PayrollCompensationTableRow[]>([])
  const [draft, setDraft] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await fetchEmployeeCompensationTable()
      setRows(list)
      const init: Record<number, string> = {}
      for (const r of list) {
        init[r.user_id] = r.monthly_base_salary_idr != null ? String(r.monthly_base_salary_idr) : ''
      }
      setDraft(init)
    } catch (e) {
      setRows([])
      alert.error('Gaji pokok', axiosDetail(e) ?? String((e as Error)?.message ?? e))
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
    const text = draft[uid]?.trim() ?? ''
    if (!text) {
      alert.error('Validasi', 'Isi nominal gaji pokok (IDR per bulan).')
      return
    }
    setSavingId(uid)
    try {
      const updated = await patchEmployeeCompensation(uid, text)
      setRows((prev) =>
        prev.map((row) =>
          row.user_id === uid
            ? {
                ...row,
                monthly_base_salary_idr: String(updated.monthly_base_salary_idr),
                compensation_updated_at: updated.updated_at,
              }
            : row
        )
      )
      setDraft((d) => ({ ...d, [uid]: String(updated.monthly_base_salary_idr) }))
      alert.success('Gaji pokok disimpan.')
    } catch (e) {
      alert.error('Gagal menyimpan', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setSavingId(null)
    }
  }

  function isDirty(uid: number) {
    const row = rows.find((r) => r.user_id === uid)
    if (!row) return false
    const cur = (draft[uid] ?? '').trim()
    const snap = row.monthly_base_salary_idr != null ? String(row.monthly_base_salary_idr).trim() : ''
    return cur !== snap
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/gaji"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke periode payroll
        </Link>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Gaji pokok pegawai aktif
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Pemilik sistem (pimpinan) dan pengguna dengan akses penggajian melihat pegawai aktif serta pimpinan
          sendiri dalam satu ringkasan. Staf ini yang masuk perhitungan pembangkit payroll bila ada data
          gaji pokok. Keuangan mengelola halaman ini tanpa formulir lengkap pegawai lain.
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
        <div className="border-outline-variant overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Gaji pokok (IDR / bln)</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell>
                    <div className="text-on-surface font-medium">{r.full_name}</div>
                    <div className="text-on-surface-variant font-mono text-xs">{r.username}</div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {USER_ROLE_LABEL[r.role as keyof typeof USER_ROLE_LABEL] ?? r.role}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.employee_code || '—'}</TableCell>
                  <TableCell>
                    <Input
                      forceUppercase={false}
                      inputMode="decimal"
                      className="h-10 min-w-[9rem]"
                      value={draft[r.user_id] ?? ''}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [r.user_id]: e.target.value }))
                      }
                      disabled={savingId === r.user_id}
                    />
                    {r.compensation_updated_at ? (
                      <div className="text-on-surface-variant mt-1 max-w-[12rem] text-[10px] leading-tight">
                        Diperbarui:{' '}
                        {new Date(r.compensation_updated_at).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    ) : null}
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
              ))}
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
