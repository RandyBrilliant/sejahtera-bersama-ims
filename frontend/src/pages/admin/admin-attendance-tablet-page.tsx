import { Html5Qrcode } from 'html5-qrcode'
import { RefreshCw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { confirmAttendanceScan, previewAttendanceScan } from '@/api/attendance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { USER_ROLE_LABEL } from '@/constants/user-roles'
import { alert } from '@/lib/alert'
import { cn } from '@/lib/utils'
import type { AttendanceIntent, AttendancePreviewResponse } from '@/types/attendance'
import { isAxiosError } from 'axios'

function fmtDt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  const detail = d?.detail
  return typeof detail === 'string' ? detail : undefined
}

function intentLabel(intent: AttendanceIntent) {
  if (intent === 'check_in') return 'Konfirmasi masuk'
  if (intent === 'check_out') return 'Konfirmasi pulang'
  return 'Sudah lengkap'
}

export function AdminAttendanceTabletPage() {
  const reactId = useId()
  const regionId = `attendance-scan-${reactId.replace(/:/g, '')}`
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const activeRef = useRef(true)

  const [scannerReady, setScannerReady] = useState(false)
  const [scanRaw, setScanRaw] = useState<string | null>(null)
  const [preview, setPreview] = useState<AttendancePreviewResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [manual, setManual] = useState('')

  async function stopScanner() {
    const qr = scannerRef.current
    scannerRef.current = null
    if (!qr) return
    try {
      await qr.stop()
    } catch {
      /* noop */
    }
    try {
      await qr.clear()
    } catch {
      /* noop */
    }
    setScannerReady(false)
  }

  async function startScanner() {
    await stopScanner()
    if (!activeRef.current) return

    const qr = new Html5Qrcode(regionId, false)
    scannerRef.current = qr
    const config = { fps: 8, qrbox: { width: 280, height: 280 } as const }

    await qr.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        void (async () => {
          if (busyRef.current || !activeRef.current) return
          busyRef.current = true
          const trimmed = decodedText.trim()
          if (!trimmed) {
            busyRef.current = false
            return
          }
          setLoadingPreview(true)
          try {
            const p = await previewAttendanceScan(trimmed)
            if (!activeRef.current) return
            setScanRaw(trimmed)
            setPreview(p)
            await stopScanner()
          } catch (e) {
            if (!activeRef.current) return
            alert.error('Gagal membaca kartu', axiosDetail(e) ?? String((e as Error)?.message ?? e))
          } finally {
            setLoadingPreview(false)
            busyRef.current = false
          }
        })()
      },
      () => {
        /* frame errors ignored */
      }
    )
    if (activeRef.current) setScannerReady(true)
  }

  useEffect(() => {
    activeRef.current = true
    void startScanner().catch(() => {
      if (!activeRef.current) return
      alert.error(
        'Kamera',
        'Tidak dapat memulai kamera. Izinkan akses atau gunakan input manual di bawah.'
      )
      setScannerReady(false)
    })

    return () => {
      activeRef.current = false
      void stopScanner()
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- kamera satu siklus per mount; regionId stabil
  }, [])

  async function runPreviewManual() {
    const trimmed = manual.trim()
    if (!trimmed) {
      alert.error('Input', 'Isi UUID atau teks QR.')
      return
    }
    setLoadingPreview(true)
    try {
      const p = await previewAttendanceScan(trimmed)
      setScanRaw(trimmed)
      setPreview(p)
      await stopScanner()
    } catch (e) {
      alert.error('Gagal membaca kartu', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleConfirm(intent: 'check_in' | 'check_out') {
    if (!preview || scanRaw == null) return
    setConfirming(true)
    try {
      const { detail } = await confirmAttendanceScan(scanRaw, intent)
      if (detail) {
        alert.success(intent === 'check_in' ? 'Masuk' : 'Pulang', detail)
      }
      setPreview(null)
      setScanRaw(null)
      void startScanner().catch(() => {
        alert.error('Kamera', 'Gagal menyalakan kamera lagi.')
      })
    } catch (e) {
      alert.error('Konfirmasi gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setConfirming(false)
    }
  }

  async function handleCancelPreview() {
    setPreview(null)
    setScanRaw(null)
    void startScanner().catch(() => {
      alert.error('Kamera', 'Gagal menyalakan kamera lagi.')
    })
  }

  const suggested = preview?.suggested_intent ?? 'check_in'
  const canAct = suggested === 'check_in' || suggested === 'check_out'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Presensi tablet (admin)
        </h1>
        <p className="text-on-surface-variant mt-2 text-sm leading-relaxed">
          Pindai QR pada kartu staf, cocokkan nama dengan orang di depan Anda, lalu konfirmasi masuk atau
          pulang sesuai petunjuk di layar.
        </p>
      </div>

      {!preview ? (
        <section className="space-y-4">
          <div
            id={regionId}
            className={cn(
              'border-outline-variant bg-surface-container-lowest ambient-shadow mx-auto w-full overflow-hidden rounded-xl border',
              !scannerReady && 'flex min-h-[280px] items-center justify-center p-8'
            )}
          >
            {!scannerReady ? (
              <p className="text-on-surface-variant text-center text-sm">Menyiapkan kamera…</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            onClick={() => void startScanner()}
            disabled={loadingPreview || confirming}
          >
            <RefreshCw className="size-4" />
            Nyalakan ulang kamera
          </Button>

          <div className="border-outline-variant space-y-2 rounded-xl border p-4">
            <Label htmlFor="manual-qr" className="text-xs font-semibold uppercase">
              Input manual (tanpa kamera)
            </Label>
            <Input
              id="manual-qr"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Tempel UUID atau seluruh teks QR"
              disabled={loadingPreview || confirming}
            />
            <Button
              type="button"
              disabled={loadingPreview || confirming || !manual.trim()}
              onClick={() => void runPreviewManual()}
            >
              Pratinjau dari teks ini
            </Button>
          </div>
          {loadingPreview ? (
            <p className="text-on-surface-variant text-sm">Membaca kartu…</p>
          ) : null}
        </section>
      ) : (
        <section className="border-outline-variant bg-surface-container-lowest ambient-shadow space-y-5 rounded-xl border p-6">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold tracking-wider uppercase">
              Konfirmasi visual
            </p>
            <p className="text-on-surface mt-1 text-xl font-semibold">{preview.full_name}</p>
            <p className="text-on-surface-variant font-mono text-sm">{preview.username}</p>
          </div>
          <dl className="text-on-surface-variant grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase">Kode karyawan</dt>
              <dd className="text-on-surface mt-0.5 font-mono">{preview.employee_code || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase">Peran</dt>
              <dd className="text-on-surface mt-0.5">
                {USER_ROLE_LABEL[preview.role as keyof typeof USER_ROLE_LABEL] ?? preview.role}
              </dd>
            </div>
          </dl>

          {!preview.already_checked_in_today ? (
            <div className="border-outline-variant rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-950 dark:text-sky-50">
              <span className="font-semibold">Belum ada presensi masuk hari ini (Jakarta).</span>
              {preview.suggested_intent === 'check_in' ? (
                <span className="mt-1 block">Langkah berikutnya: konfirmasi masuk.</span>
              ) : null}
            </div>
          ) : (
            <div className="border-outline-variant rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
              <span className="font-semibold">Sudah ada presensi masuk hari ini.</span>
              {preview.checked_in_at ? (
                <span className="mt-1 block tabular-nums">
                  Waktu masuk: {fmtDt(preview.checked_in_at)}
                </span>
              ) : null}
              {preview.is_late ? (
                <span className="mt-1 block">
                  Terlambat
                  {preview.minutes_late != null ? ` (+${preview.minutes_late} menit)` : ''}.
                </span>
              ) : preview.already_checked_in_today && preview.checked_in_at ? (
                <span className="mt-1 block">Tepat waktu / dalam toleransi.</span>
              ) : null}
            </div>
          )}

          {preview.already_checked_in_today && preview.already_checked_out_today ? (
            <div className="border-outline-variant rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-950 dark:text-emerald-50">
              <span className="font-semibold">Sudah lengkap: masuk dan pulang tercatat.</span>
              {preview.checked_out_at ? (
                <span className="mt-1 block tabular-nums">
                  Waktu pulang: {fmtDt(preview.checked_out_at)}
                </span>
              ) : null}
            </div>
          ) : preview.already_checked_in_today && !preview.already_checked_out_today ? (
            <div className="border-outline-variant rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-950 dark:text-violet-50">
              <span className="font-semibold">Belum ada presensi pulang hari ini.</span>
              <span className="mt-1 block">Langkah berikutnya: konfirmasi pulang.</span>
            </div>
          ) : null}

          <div className="border-outline-variant rounded-lg border bg-surface-container-low px-3 py-2 text-sm">
            <span className="text-on-surface-variant text-xs font-semibold uppercase">Aksi disarankan</span>
            <p className="text-on-surface mt-1 font-medium">{intentLabel(suggested)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canAct && suggested === 'check_in' ? (
              <Button
                type="button"
                onClick={() => void handleConfirm('check_in')}
                disabled={confirming}
              >
                {confirming ? 'Menyimpan…' : 'Konfirmasi masuk'}
              </Button>
            ) : null}
            {canAct && suggested === 'check_out' ? (
              <Button
                type="button"
                onClick={() => void handleConfirm('check_out')}
                disabled={confirming}
              >
                {confirming ? 'Menyimpan…' : 'Konfirmasi pulang'}
              </Button>
            ) : null}
            {!canAct ? (
              <p className="text-on-surface-variant w-full text-sm">
                Tidak ada aksi konfirmasi — presensi hari ini sudah selesai. Gunakan Batal untuk memindai
                kartu lain.
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleCancelPreview()}
              disabled={confirming}
            >
              Batal / pindaian lagi
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
