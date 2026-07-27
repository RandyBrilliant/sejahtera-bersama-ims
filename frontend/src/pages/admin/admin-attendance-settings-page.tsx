import { useEffect, useState } from 'react'

import { fetchAttendanceSettings, patchAttendanceSettings } from '@/api/attendance'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { alert } from '@/lib/alert'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  const detail = d?.detail
  return typeof detail === 'string' ? detail : undefined
}

/** Normalisasi waktu HH:MM — backend menyimpan sebagai time string. */
function timeForInput(isoLike: string) {
  if (!isoLike) return ''
  const m = isoLike.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return isoLike.slice(0, 5)
  const h = String(Number(m[1])).padStart(2, '0')
  const min = m[2]
  return `${h}:${min}`
}

export function AdminAttendanceSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [workStart, setWorkStart] = useState('')
  const [graceMinutes, setGraceMinutes] = useState('')
  const [minHoursCheckout, setMinHoursCheckout] = useState('')
  const [minWorkHoursFullDay, setMinWorkHoursFullDay] = useState('')
  const [lateFineIdr, setLateFineIdr] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await fetchAttendanceSettings()
        if (cancelled) return
        setWorkStart(timeForInput(s.work_start_time))
        setGraceMinutes(String(s.grace_minutes ?? 0))
        setMinHoursCheckout(String(s.minimum_hours_before_checkout ?? 1))
        setMinWorkHoursFullDay(String(s.minimum_work_hours_full_day ?? 6))
        const fineRaw = Number(s.late_fine_idr ?? 20000)
        setLateFineIdr(Number.isFinite(fineRaw) ? String(Math.trunc(fineRaw)) : '20000')
      } catch (e) {
        if (!cancelled) {
          alert.error('Presensi', axiosDetail(e) ?? String((e as Error)?.message ?? e))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    const gm = Number(graceMinutes)
    const minCheckout = Number(minHoursCheckout)
    const minFullDay = Number(minWorkHoursFullDay)
    const fine = Number(lateFineIdr)

    if (!Number.isFinite(gm) || gm < 0 || !Number.isInteger(gm)) {
      alert.error('Validasi', 'Toleransi terlambat harus bilangan bulat ≥ 0.')
      return
    }
    if (!Number.isFinite(minCheckout) || minCheckout < 1 || !Number.isInteger(minCheckout)) {
      alert.error('Validasi', 'Jeda sebelum pulang minimal 1 jam (bilangan bulat).')
      return
    }
    if (!Number.isFinite(minFullDay) || minFullDay < 1 || !Number.isInteger(minFullDay)) {
      alert.error('Validasi', 'Jam kerja penuh minimal 1 jam (bilangan bulat).')
      return
    }
    if (!Number.isFinite(fine) || fine < 0) {
      alert.error('Validasi', 'Denda terlambat harus angka ≥ 0.')
      return
    }
    if (!/^\d{2}:\d{2}$/.test(workStart)) {
      alert.error('Validasi', 'Format jam kerja pakai HH:MM (mis. 08:00).')
      return
    }
    setSaving(true)
    try {
      const [hh, mm] = workStart.split(':').map((x) => Number(x))
      if (
        hh == null ||
        mm == null ||
        !Number.isFinite(hh) ||
        !Number.isFinite(mm) ||
        hh < 0 ||
        hh > 23 ||
        mm < 0 ||
        mm > 59
      ) {
        alert.error('Validasi', 'Jam kerja tidak valid.')
        setSaving(false)
        return
      }
      await patchAttendanceSettings({
        work_start_time: `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:00`,
        grace_minutes: gm,
        minimum_hours_before_checkout: minCheckout,
        minimum_work_hours_full_day: minFullDay,
        late_fine_idr: String(fine),
      })
      alert.success('Disimpan', 'Pengaturan presensi diperbarui.')
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Pengaturan presensi
        </h1>
        <p className="text-on-surface-variant mt-2 text-sm leading-relaxed">
          Jam kerja, toleransi keterlambatan, aturan absen pulang, dan denda/potongan gaji harian
          (zona Jakarta di server).
        </p>
      </div>

      {loading ? (
        <p className="text-on-surface-variant text-sm">Memuat…</p>
      ) : (
        <section className="border-outline-variant space-y-5 rounded-xl border p-6">
          <div className="space-y-2">
            <Label htmlFor="work-start" className="text-xs font-semibold uppercase">
              Jam mulai kerja nominal
            </Label>
            <Input
              id="work-start"
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grace-min" className="text-xs font-semibold uppercase">
              Grace terlambat (menit)
            </Label>
            <Input
              id="grace-min"
              inputMode="numeric"
              min={0}
              value={graceMinutes}
              onChange={(e) => setGraceMinutes(e.target.value.replace(/\D/g, ''))}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-checkout-hours" className="text-xs font-semibold uppercase">
              Jeda sebelum absen pulang (jam)
            </Label>
            <Input
              id="min-checkout-hours"
              inputMode="numeric"
              min={1}
              value={minHoursCheckout}
              onChange={(e) => setMinHoursCheckout(e.target.value.replace(/\D/g, ''))}
              disabled={saving}
            />
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Mencegah double tap: staf baru bisa absen pulang setelah interval ini sejak masuk.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-full-day-hours" className="text-xs font-semibold uppercase">
              Jam kerja untuk gaji harian penuh
            </Label>
            <Input
              id="min-full-day-hours"
              inputMode="numeric"
              min={1}
              value={minWorkHoursFullDay}
              onChange={(e) => setMinWorkHoursFullDay(e.target.value.replace(/\D/g, ''))}
              disabled={saving}
            />
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Kurang dari ini (atau belum absen pulang): gaji harian dihitung setengah.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="late-fine" className="text-xs font-semibold uppercase">
              Denda terlambat (IDR)
            </Label>
            <CurrencyInput
              id="late-fine"
              value={lateFineIdr}
              onChange={setLateFineIdr}
              disabled={saving}
              placeholder="Mis. 20.000"
            />
          </div>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </section>
      )}
    </div>
  )
}
