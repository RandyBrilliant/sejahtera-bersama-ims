import { useEffect, useState, type ReactNode } from 'react'

import { fetchEmployeeCompensation, patchEmployeeCompensation } from '@/api/payroll'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import { alert } from '@/lib/alert'
import { cn } from '@/lib/utils'
import type { EmployeeCompensation, PayCadence, PayType } from '@/types/payroll'
import { PAY_CADENCE_LABEL, PAY_TYPE_LABEL } from '@/types/payroll'
import { isAxiosError } from 'axios'

type Props = {
  userId: number
  variant?: 'embedded' | 'standalone'
}

type Draft = {
  pay_type: PayType
  pay_cadence: PayCadence
  daily_rate_idr: string
  monthly_base_salary_idr: string
}

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  const detail = d?.detail
  return typeof detail === 'string' ? detail : undefined
}

/** Normalize API decimal/string amounts to digits-only for CurrencyInput. */
function idrToDigits(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return String(Math.trunc(n))
}

function draftFromSnap(snap: EmployeeCompensation | null): Draft {
  if (!snap) {
    return {
      pay_type: 'DAILY',
      pay_cadence: 'MONTHLY',
      daily_rate_idr: '',
      monthly_base_salary_idr: '',
    }
  }
  return {
    pay_type: snap.pay_type ?? 'DAILY',
    pay_cadence: snap.pay_cadence ?? 'MONTHLY',
    daily_rate_idr: idrToDigits(snap.daily_rate_idr),
    monthly_base_salary_idr: idrToDigits(snap.monthly_base_salary_idr),
  }
}

function draftMatchesSnap(draft: Draft, snap: EmployeeCompensation | null): boolean {
  if (!snap) {
    return !draft.daily_rate_idr.trim() && !draft.monthly_base_salary_idr.trim()
  }
  const fromSnap = draftFromSnap(snap)
  return (
    draft.pay_type === fromSnap.pay_type &&
    draft.pay_cadence === fromSnap.pay_cadence &&
    draft.daily_rate_idr.trim() === fromSnap.daily_rate_idr &&
    draft.monthly_base_salary_idr.trim() === fromSnap.monthly_base_salary_idr
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
    if (draft.pay_type === 'DAILY') {
      const hasPokok =
        draft.pay_cadence === 'MONTHLY' && draft.monthly_base_salary_idr.trim().length > 0
      const hasDaily = draft.daily_rate_idr.trim().length > 0
      if (!hasPokok && !hasDaily) {
        alert.error(
          'Validasi',
          draft.pay_cadence === 'MONTHLY'
            ? 'Isi gaji pokok bulanan, atau tarif harian jika pokok dikosongkan.'
            : 'Isi tarif harian untuk pegawai berpresensi.'
        )
        return
      }
    }
    setSaving(true)
    try {
      const updated = await patchEmployeeCompensation(userId, {
        pay_type: draft.pay_type,
        pay_cadence: draft.pay_cadence,
        daily_rate_idr: draft.daily_rate_idr.trim() || '0',
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
  const showDailyRate = draft.pay_type === 'DAILY'
  const showMonthlyBase = draft.pay_type === 'DAILY' || draft.pay_type === 'PIECE_RATE'
  const canSave =
    draft.pay_type === 'PIECE_RATE' ||
    draft.daily_rate_idr.trim().length > 0 ||
    (draft.pay_cadence === 'MONTHLY' && draft.monthly_base_salary_idr.trim().length > 0)

  const form = loading ? (
    <p className="text-on-surface-variant text-sm">Memuat…</p>
  ) : (
    <div className="flex max-w-md flex-col gap-5">
      <FieldGroup
        label="Tipe gaji"
        htmlFor={`pay-type-${userId}`}
        hint={
          draft.pay_type === 'DAILY'
            ? 'Presensi × tarif harian. Bulanan: jika gaji pokok diisi → pokok tetap; jika kosong → tarif harian × hadir.'
            : 'Borongan kupas (kg × tarif), dibayar mingguan atau digabung bulanan — bukan gaji pokok.'
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

      <FieldGroup
        label="Periode bayar"
        htmlFor={`pay-cadence-${userId}`}
        hint="Mingguan masuk periode Sabtu; bulanan masuk periode bulanan. Bisa diganti per orang (termasuk staf kupas)."
      >
        <select
          id={`pay-cadence-${userId}`}
          className={selectClass}
          value={draft.pay_cadence}
          onChange={(e) => setDraft((d) => ({ ...d, pay_cadence: e.target.value as PayCadence }))}
          disabled={saving}
        >
          {(Object.keys(PAY_CADENCE_LABEL) as PayCadence[]).map((pc) => (
            <option key={pc} value={pc}>
              {PAY_CADENCE_LABEL[pc]}
            </option>
          ))}
        </select>
      </FieldGroup>

      {showDailyRate ? (
        <FieldGroup
          label="Tarif harian (IDR)"
          htmlFor={`daily-rate-${userId}`}
          hint={
            draft.pay_cadence === 'MONTHLY'
              ? 'Dipakai jika gaji pokok bulanan kosong.'
              : undefined
          }
        >
          <CurrencyInput
            id={`daily-rate-${userId}`}
            placeholder="Mis. 100.000"
            value={draft.daily_rate_idr}
            onChange={(daily_rate_idr) => setDraft((d) => ({ ...d, daily_rate_idr }))}
            disabled={saving}
          />
        </FieldGroup>
      ) : null}

      {showMonthlyBase ? (
        <FieldGroup
          label={
            draft.pay_type === 'DAILY' && draft.pay_cadence === 'MONTHLY'
              ? 'Gaji pokok bulanan (opsional)'
              : 'Gaji pokok bulanan (referensi, opsional)'
          }
          htmlFor={`monthly-ref-${userId}`}
          hint={
            draft.pay_type === 'DAILY' && draft.pay_cadence === 'MONTHLY'
              ? 'Jika diisi: bruto tetap tiap bulan (+ potongan telat). Jika kosong: pakai tarif harian × hadir.'
              : 'Opsional untuk catatan; tidak dipakai hitung borongan kupas.'
          }
        >
          <CurrencyInput
            id={`monthly-ref-${userId}`}
            placeholder="Mis. 5.000.000"
            value={draft.monthly_base_salary_idr}
            onChange={(monthly_base_salary_idr) =>
              setDraft((d) => ({ ...d, monthly_base_salary_idr }))
            }
            disabled={saving}
          />
        </FieldGroup>
      ) : null}

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
    ? 'Atur tipe dan periode bayar. Gudang/kupas biasanya mingguan; bisa diganti bulanan per orang.'
    : 'Belum ada data kompensasi. Isi tipe gaji, periode bayar, dan tarif di bawah.'

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
