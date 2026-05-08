import { useEffect, useState } from 'react'

import { fetchAttendanceSettings, patchAttendanceSettings } from '@/api/attendance'
import { Button } from '@/components/ui/button'
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

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const s = await fetchAttendanceSettings()
        if (cancelled) return
        setWorkStart(timeForInput(s.work_start_time))
        setGraceMinutes(String(s.grace_minutes ?? 0))
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
    if (!Number.isFinite(gm) || gm < 0 || !Number.isInteger(gm)) {
      alert.error('Validasi', 'Toleransi terlambat harus bilangan bulat ≥ 0.')
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
          Jam kerja nominal dan toleransi untuk menandai ketidakhadiran tepat waktu (zona Jakarta di server).
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
            <p className="text-on-surface-variant text-xs leading-relaxed">
              Menit pertama setelah jam mulai yang masih dianggap tidak terlambat.
            </p>
          </div>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </section>
      )}
    </div>
  )
}
