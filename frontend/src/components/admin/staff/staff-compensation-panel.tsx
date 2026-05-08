import { useEffect, useState } from 'react'

import { fetchEmployeeCompensation, patchEmployeeCompensation } from '@/api/payroll'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { alert } from '@/lib/alert'
import type { EmployeeCompensation } from '@/types/payroll'
import { isAxiosError } from 'axios'

type Props = {
  userId: number
}

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  const detail = d?.detail
  return typeof detail === 'string' ? detail : undefined
}

export function StaffCompensationPanel({ userId }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [snap, setSnap] = useState<EmployeeCompensation | null>(null)
  const [salaryText, setSalaryText] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const c = await fetchEmployeeCompensation(userId)
        if (cancelled) return
        setSnap(c)
        setSalaryText(String(c.monthly_base_salary_idr ?? ''))
      } catch {
        if (!cancelled) {
          setSnap(null)
          setSalaryText('')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [userId])

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await patchEmployeeCompensation(userId, salaryText.trim())
      setSnap(updated)
      alert.success('Gaji pokok', 'Nominal bulanan disimpan.')
    } catch (e) {
      alert.error('Gagal menyimpan', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="border-outline-variant border-t pt-4">
        <h2 className="text-on-surface mb-3 text-sm font-semibold tracking-wide uppercase">
          Gaji pokok (bulanan)
        </h2>
        <p className="text-on-surface-variant text-sm">Memuat…</p>
      </section>
    )
  }

  if (!snap) {
    return (
      <section className="border-outline-variant border-t pt-4">
        <h2 className="text-on-surface mb-3 text-sm font-semibold tracking-wide uppercase">
          Gaji pokok (bulanan)
        </h2>
        <p className="text-on-surface-variant text-sm">
          Belum ada data kompensasi untuk pengguna ini. Simpan nominal di bawah untuk membuat rekaman.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor={`salary-${userId}`} className="text-xs font-semibold uppercase">
            Nominal IDR per bulan
          </Label>
          <Input
            id={`salary-${userId}`}
            inputMode="decimal"
            placeholder="Mis. 5000000"
            value={salaryText}
            onChange={(e) => setSalaryText(e.target.value)}
            disabled={saving}
          />
          <Button type="button" disabled={saving || !salaryText.trim()} onClick={() => void handleSave()}>
            {saving ? 'Menyimpan…' : 'Simpan gaji pokok'}
          </Button>
        </div>
      </section>
    )
  }

  const dirty =
    salaryText.trim() !== String(snap.monthly_base_salary_idr ?? '').trim()

  return (
    <section className="border-outline-variant border-t pt-4">
      <h2 className="text-on-surface mb-3 text-sm font-semibold tracking-wide uppercase">
        Gaji pokok (bulanan)
      </h2>
      <p className="text-on-surface-variant mb-4 text-xs leading-relaxed">
        Digunakan sebagai dasar slip gaji per periode. Potongan tambahan diatur di halaman payroll per
        periode.
      </p>
      <div className="space-y-2">
        <Label htmlFor={`salary-${userId}`} className="text-xs font-semibold uppercase">
          Nominal IDR per bulan
        </Label>
        <Input
          id={`salary-${userId}`}
          inputMode="decimal"
          value={salaryText}
          onChange={(e) => setSalaryText(e.target.value)}
          disabled={saving}
        />
        <Button type="button" disabled={saving || !dirty} onClick={() => void handleSave()}>
          {saving ? 'Menyimpan…' : 'Simpan perubahan'}
        </Button>
      </div>
    </section>
  )
}
