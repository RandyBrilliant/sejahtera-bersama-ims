import { useEffect, useState, type ReactNode } from 'react'

import { fetchEmployeeCompensation, patchEmployeeCompensation } from '@/api/payroll'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { alert } from '@/lib/alert'
import { cn } from '@/lib/utils'
import type { EmployeeCompensation, PayType } from '@/types/payroll'
import { PAY_TYPE_LABEL } from '@/types/payroll'
import { isAxiosError } from 'axios'

type Props = {
  userId: number
  variant?: 'embedded' | 'standalone'
}

type Draft = {
  pay_type: PayType
  daily_rate_idr: string
  monthly_base_salary_idr: string
}

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  const detail = d?.detail
  return typeof detail === 'string' ? detail : undefined
}

function draftFromSnap(snap: EmployeeCompensation | null): Draft {
  if (!snap) {
    return { pay_type: 'DAILY', daily_rate_idr: '', monthly_base_salary_idr: '' }
  }
  return {
    pay_type: snap.pay_type ?? 'DAILY',
    daily_rate_idr: String(snap.daily_rate_idr ?? ''),
    monthly_base_salary_idr: String(snap.monthly_base_salary_idr ?? ''),
  }
}

function draftMatchesSnap(draft: Draft, snap: EmployeeCompensation | null): boolean {
  if (!snap) {
    return !draft.daily_rate_idr.trim() && !draft.monthly_base_salary_idr.trim()
  }
  return (
    draft.pay_type === (snap.pay_type ?? 'DAILY') &&
    draft.daily_rate_idr.trim() === String(snap.daily_rate_idr ?? '').trim() &&
    draft.monthly_base_salary_idr.trim() === String(snap.monthly_base_salary_idr ?? '').trim()
  )
}

const selectClass = cn(
  'border-input bg-field h-10 w-full rounded-lg border px-3 text-sm outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
)

function FieldGroup({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-on-surface-variant text-xs leading-relaxed">{hint}</p> : null}
    </div>
  )
}

export function StaffCompensationPanel({ userId, variant = 'embedded' }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [snap, setSnap] = useState<EmployeeCompensation | null>(null)
  const [draft, setDraft] = useState<Draft>(draftFromSnap(null))

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const c = await fetchEmployeeCompensation(userId)
        if (cancelled) return
        setSnap(c)
        setDraft(draftFromSnap(c))
      } catch {
        if (!cancelled) {
          setSnap(null)
          setDraft(draftFromSnap(null))
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
    if (draft.pay_type === 'DAILY' && !draft.daily_rate_idr.trim()) {
      alert.error('Validasi', 'Isi tarif harian untuk pegawai presensi.')
      return
    }
    setSaving(true)
    try {
      const updated = await patchEmployeeCompensation(userId, {
        pay_type: draft.pay_type,
        daily_rate_idr: draft.pay_type === 'DAILY' ? draft.daily_rate_idr.trim() : '0',
        monthly_base_salary_idr: draft.monthly_base_salary_idr.trim() || '0',
      })
      setSnap(updated)
      setDraft(draftFromSnap(updated))
      alert.success('Kompensasi', 'Data gaji disimpan.')
    } catch (e) {
      alert.error('Gagal menyimpan', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  const dirty = !draftMatchesSnap(draft, snap)
  const canSave =
    draft.pay_type === 'PIECE_RATE' ||
    draft.daily_rate_idr.trim().length > 0 ||
    draft.monthly_base_salary_idr.trim().length > 0

  const form = loading ? (
    <p className="text-on-surface-variant text-sm">Memuat…</p>
  ) : (
    <div className="flex max-w-md flex-col gap-5">
      <FieldGroup
        label="Tipe gaji"
        htmlFor={`pay-type-${userId}`}
        hint={
          draft.pay_type === 'DAILY'
            ? 'Gaji dihitung dari presensi × tarif harian. Potongan telat dan bonus diatur per periode payroll.'
            : 'Gaji dihitung dari hasil kupas (kg × tarif jenis barang). Tidak pakai presensi.'
        }
      >
        <select
          id={`pay-type-${userId}`}
          className={selectClass}
          value={draft.pay_type}
          onChange={(e) => setDraft((d) => ({ ...d, pay_type: e.target.value as PayType }))}
          disabled={saving}
        >
          {(Object.keys(PAY_TYPE_LABEL) as PayType[]).map((pt) => (
            <option key={pt} value={pt}>
              {PAY_TYPE_LABEL[pt]}
            </option>
          ))}
        </select>
      </FieldGroup>

      {draft.pay_type === 'DAILY' ? (
        <FieldGroup label="Tarif harian (IDR)" htmlFor={`daily-rate-${userId}`}>
          <Input
            id={`daily-rate-${userId}`}
            inputMode="decimal"
            placeholder="Mis. 100000"
            value={draft.daily_rate_idr}
            onChange={(e) => setDraft((d) => ({ ...d, daily_rate_idr: e.target.value }))}
            disabled={saving}
          />
        </FieldGroup>
      ) : null}

      <FieldGroup
        label="Gaji pokok bulanan (referensi, opsional)"
        htmlFor={`monthly-ref-${userId}`}
        hint="Hanya untuk catatan; perhitungan slip memakai presensi atau kupas sesuai tipe di atas."
      >
        <Input
          id={`monthly-ref-${userId}`}
          inputMode="decimal"
          placeholder="Mis. 5000000"
          value={draft.monthly_base_salary_idr}
          onChange={(e) => setDraft((d) => ({ ...d, monthly_base_salary_idr: e.target.value }))}
          disabled={saving}
        />
      </FieldGroup>

      <div className="pt-1">
        <Button
          type="button"
          disabled={saving || !canSave || (snap != null && !dirty)}
          onClick={() => void handleSave()}
        >
          {saving ? 'Menyimpan…' : snap ? 'Simpan perubahan' : 'Simpan kompensasi'}
        </Button>
      </div>
    </div>
  )

  const title = 'Kompensasi & gaji'
  const description = snap
    ? 'Atur tipe gaji pegawai ini. Satu orang hanya bisa harian (presensi) atau borongan kupas.'
    : 'Belum ada data kompensasi. Isi tipe gaji dan tarif di bawah untuk membuat rekaman.'

  if (variant === 'standalone') {
    return (
      <Card className="border-outline-variant bg-surface-container-lowest ambient-shadow max-w-xl border shadow-none">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="font-heading text-lg">{title}</CardTitle>
          <CardDescription className="text-on-surface-variant">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">{form}</CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <section className="border-outline-variant border-t pt-4">
        <h2 className="text-on-surface mb-3 text-sm font-semibold tracking-wide uppercase">
          {title}
        </h2>
        <p className="text-on-surface-variant text-sm">Memuat…</p>
      </section>
    )
  }

  return (
    <section className="border-outline-variant border-t pt-4">
      <h2 className="text-on-surface mb-3 text-sm font-semibold tracking-wide uppercase">
        {title}
      </h2>
      <p className="text-on-surface-variant mb-4 text-xs leading-relaxed">{description}</p>
      {form}
    </section>
  )
}
