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

const CAMERA_ERR_INSECURE = '__CAMERA_INSECURE_CONTEXT__'
const CAMERA_ERR_NO_API = '__CAMERA_API_UNSUPPORTED__'
const CAMERA_ERR_PERMISSION_DENIED = '__CAMERA_PERMISSION_DENIED__'
const CAMERA_ERR_POLICY_BLOCKED = '__CAMERA_PERMISSIONS_POLICY_BLOCKED__'

function assertCameraAllowedByDocumentPolicyOrThrow() {
  type DocWithPermissionsPolicy = Document & {
    permissionsPolicy?: { allowsFeature: (feature: string) => boolean }
  }
  const pp = (document as DocWithPermissionsPolicy).permissionsPolicy
  if (!pp) return
  try {
    if (!pp.allowsFeature('camera')) {
      throw new Error(CAMERA_ERR_POLICY_BLOCKED)
    }
  } catch (e) {
    if (e instanceof Error && e.message === CAMERA_ERR_POLICY_BLOCKED) throw e
  }
}

function assertCameraEnvironmentOrThrow() {
  if (typeof window === 'undefined') return
  if (!window.isSecureContext) {
    throw new Error(CAMERA_ERR_INSECURE)
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(CAMERA_ERR_NO_API)
  }
}

/** Map library / browser errors to actionable copy (many failures never show the system permission sheet). */
function formatCameraFailure(err: unknown): { title: string; detail: string } {
  const title = 'Kamera'
  if (err instanceof Error) {
    if (err.message === CAMERA_ERR_INSECURE) {
      return {
        title,
        detail:
          'Browser tidak menampilkan izin kamera untuk halaman HTTP (misalnya http://IP:port dari komputer). Buka aplikasi lewat HTTPS, atau gunakan tunnel (ngrok, cloudflare tunnel) / domain dengan SSL. Tanpa HTTPS, kamera diblokir tanpa dialog izin.',
      }
    }
    if (err.message === CAMERA_ERR_NO_API) {
      return {
        title,
        detail:
          'Peramban atau WebView ini tidak menyediakan getUserMedia (mode penyamaran, WebView dibatasi, atau versi lama). Coba Chrome/Samsung Internet terbaru, atau gunakan input manual QR.',
      }
    }
    if (err.message === CAMERA_ERR_PERMISSION_DENIED) {
      return {
        title,
        detail:
          'Izin kamera untuk situs ini sudah ditolak permanen, jadi dialog izin tidak muncul. Buka pengaturan situs (ikon gembok / “i” di bilah alamat) → Izin → Kamera → Izinkan, lalu muat ulang halaman.',
      }
    }
    if (err.message === CAMERA_ERR_POLICY_BLOCKED) {
      return {
        title,
        detail:
          'Kamera diblokir oleh header HTTP Permissions-Policy untuk situs ini (bukan pengaturan izin di HP). Pastikan deployment memakai `camera=(self)` atau menghapus `camera=()` dari header. Setelah diperbaiki, deploy ulang dan hard-refresh.',
      }
    }
  }

  if (err instanceof DOMException && err.name === 'NotAllowedError') {
    return {
      title,
      detail:
        'Akses kamera ditolak. Jika dialog izin tidak pernah muncul, buka pengaturan situs di browser (ikon gembok / informasi situs) dan setel Kamera ke Izinkan.',
    }
  }

  const raw =
    typeof err === 'string'
      ? err
      : err instanceof DOMException
        ? `${err.name}: ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err)
  const lower = raw.toLowerCase()

  if (
    lower.includes('secure context') ||
    lower.includes('insecurecontext') ||
    (lower.includes('https') && lower.includes('localhost')) ||
    lower.includes('only supported in secure')
  ) {
    return {
      title,
      detail:
        'Akses kamera membutuhkan koneksi aman (HTTPS). Lewat HTTP biasa, browser memblokir kamera tanpa menampilkan permintaan izin. Pakai HTTPS atau input manual.',
    }
  }
  if (
    lower.includes('notallowed') ||
    lower.includes('permission denied') ||
    lower.includes('denied') ||
    lower.includes('notallowederror')
  ) {
    return {
      title,
      detail:
        'Akses kamera ditolak atau diblokir. Jika Anda tidak pernah melihat dialog izin, kemungkinan izin sudah “Ditolak” di pengaturan situs — buka pengaturan situs di browser dan setel Kamera ke Izinkan.',
    }
  }
  if (lower.includes('notfound') || lower.includes('devicesnotfound')) {
    return { title, detail: 'Tidak ada kamera yang terdeteksi di perangkat ini.' }
  }
  if (
    lower.includes('permissions policy') ||
    lower.includes('permissions-policy') ||
    lower.includes('not allowed in this document')
  ) {
    return {
      title,
      detail:
        'Kamera diblokir oleh Permissions-Policy pada respons server (sering `camera=()`). Ubah menjadi `camera=(self)` di konfigurasi hosting (misalnya Vercel headers), deploy ulang, lalu muat ulang halaman.',
    }
  }
  if (lower.includes('notreadable') || lower.includes('trackstarterror') || lower.includes('could not start')) {
    return {
      title,
      detail:
        'Kamera tidak bisa dibuka (mungkin dipakai aplikasi lain). Tutup aplikasi yang memakai kamera, lalu coba lagi.',
    }
  }

  return {
    title,
    detail: `Tidak dapat memulai kamera. ${raw ? `${raw}. ` : ''}Anda tetap bisa memakai input manual di bawah.`,
  }
}

function isInsecureCameraError(err: unknown): boolean {
  return err instanceof Error && err.message === CAMERA_ERR_INSECURE
}

function isNoCameraApiError(err: unknown): boolean {
  return err instanceof Error && err.message === CAMERA_ERR_NO_API
}

function isPermissionDeniedError(err: unknown): boolean {
  return err instanceof Error && err.message === CAMERA_ERR_PERMISSION_DENIED
}

function isPolicyBlockedError(err: unknown): boolean {
  return err instanceof Error && err.message === CAMERA_ERR_POLICY_BLOCKED
}

async function assertCameraPermissionNotDeniedOrThrow() {
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
    if (status.state === 'denied') {
      throw new Error(CAMERA_ERR_PERMISSION_DENIED)
    }
  } catch (e) {
    if (e instanceof Error && e.message === CAMERA_ERR_PERMISSION_DENIED) throw e
    /* Permissions API tidak mendukung "camera" di beberapa browser — abaikan */
  }
}

/** Prefer rear/wide lens when labels are available; avoids facingMode hangs on some tablets. */
async function pickCameraIdForQrScan(): Promise<string | undefined> {
  try {
    const devices = await Html5Qrcode.getCameras()
    if (!devices?.length) return undefined
    const preferBack = (label: string) =>
      /back|rear|belakang|environment|wide|ultra|world/i.test(label)
    const preferFront = (label: string) => /front|user|depan|selfie|facetime/i.test(label)
    const withLabel = devices.filter((d) => d.label?.trim())
    const back = withLabel.find((d) => preferBack(d.label))
    if (back) return back.id
    const nonFront = withLabel.find((d) => !preferFront(d.label))
    if (nonFront) return nonFront.id
    if (devices.length === 1) return devices[0].id
    return devices[devices.length - 1]?.id
  } catch {
    return undefined
  }
}

type CameraStartConfig = string | { facingMode: string }

async function resolveCameraStartConfig(): Promise<CameraStartConfig> {
  const id = await pickCameraIdForQrScan()
  if (id) return id
  return { facingMode: 'environment' }
}

async function safeReleaseScanner(qr: Html5Qrcode) {
  try {
    await qr.stop()
  } catch {
    /* not running yet or already stopped */
  }
  try {
    await qr.clear()
  } catch {
    /* noop */
  }
}

export function AdminAttendanceTabletPage() {
  const reactId = useId()
  const regionId = `attendance-scan-${reactId.replace(/:/g, '')}`
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const activeRef = useRef(true)
  const sessionEpochRef = useRef(0)

  const [scannerReady, setScannerReady] = useState(false)
  const [scanRaw, setScanRaw] = useState<string | null>(null)
  const [preview, setPreview] = useState<AttendancePreviewResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [manual, setManual] = useState('')
  const [cameraEnvIssue, setCameraEnvIssue] = useState<'insecure' | 'unsupported' | 'denied' | 'policy' | null>(null)

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

    const epoch = sessionEpochRef.current
    let qr: Html5Qrcode | null = null

    try {
      assertCameraEnvironmentOrThrow()
      assertCameraAllowedByDocumentPolicyOrThrow()
      await assertCameraPermissionNotDeniedOrThrow()

      qr = new Html5Qrcode(regionId, {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: false },
      })
      const config = { fps: 8, qrbox: { width: 280, height: 280 } as const }

      const tryStart = async (camera: CameraStartConfig) => {
        await qr!.start(
          camera,
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
      }

      let camera = await resolveCameraStartConfig()
      if (!activeRef.current || sessionEpochRef.current !== epoch) {
        await safeReleaseScanner(qr)
        return
      }
      try {
        await tryStart(camera)
      } catch (firstErr) {
        if (typeof camera === 'string') throw firstErr
        await safeReleaseScanner(qr)
        camera = { facingMode: 'user' }
        await tryStart(camera)
      }
      if (!activeRef.current || sessionEpochRef.current !== epoch) {
        await safeReleaseScanner(qr)
        return
      }
      scannerRef.current = qr
      qr = null
      setCameraEnvIssue(null)
      setScannerReady(true)
    } catch (err) {
      if (qr) await safeReleaseScanner(qr)
      if (!activeRef.current || sessionEpochRef.current !== epoch) return
      if (isInsecureCameraError(err)) setCameraEnvIssue('insecure')
      else if (isNoCameraApiError(err)) setCameraEnvIssue('unsupported')
      else if (isPermissionDeniedError(err)) setCameraEnvIssue('denied')
      else if (isPolicyBlockedError(err)) setCameraEnvIssue('policy')
      else setCameraEnvIssue(null)
      throw err
    }
  }

  function handleCameraStartFailure(err: unknown) {
    const { title, detail } = formatCameraFailure(err)
    alert.error(title, detail)
    setScannerReady(false)
  }

  useEffect(() => {
    activeRef.current = true
    void startScanner().catch((err: unknown) => {
      if (!activeRef.current) return
      handleCameraStartFailure(err)
    })

    return () => {
      sessionEpochRef.current += 1
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
      void startScanner().catch((err: unknown) => handleCameraStartFailure(err))
    } catch (e) {
      alert.error('Konfirmasi gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setConfirming(false)
    }
  }

  async function handleCancelPreview() {
    setPreview(null)
    setScanRaw(null)
    void startScanner().catch((err: unknown) => handleCameraStartFailure(err))
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
          {cameraEnvIssue === 'denied' ? (
            <div className="border-outline-variant rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-950 dark:text-rose-50">
              <p className="font-semibold">Izin kamera untuk situs ini ditolak</p>
              <p className="text-on-surface-variant mt-1 leading-relaxed">
                Browser tidak akan menampilkan dialog lagi sampai Anda mengubah pengaturan. Buka menu situs →
                izin → kamera → izinkan, lalu muat ulang halaman.
              </p>
            </div>
          ) : null}
          {cameraEnvIssue === 'policy' ? (
            <div className="border-outline-variant rounded-xl border border-violet-500/35 bg-violet-500/10 px-4 py-3 text-sm text-violet-950 dark:text-violet-50">
              <p className="font-semibold">Kamera diblokir oleh kebijakan situs (Permissions-Policy)</p>
              <p className="text-on-surface-variant mt-1 leading-relaxed">
                Header respons halaman memakai pembatasan seperti <span className="font-mono">camera=()</span>.
                Untuk presensi tablet, gunakan <span className="font-mono">camera=(self)</span> di konfigurasi
                hosting (misalnya Vercel), deploy ulang, lalu hard-refresh.
              </p>
            </div>
          ) : null}
          {cameraEnvIssue === 'insecure' ? (
            <div className="border-outline-variant rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50">
              <p className="font-semibold">Kamera tidak bisa dipakai lewat HTTP biasa</p>
              <p className="text-on-surface-variant mt-1 leading-relaxed">
                Di HP, alamat seperti <span className="font-mono">http://192.168.…</span> bukan “secure
                context”: browser memblokir kamera tanpa menampilkan permintaan izin. Pakai{' '}
                <span className="text-on-surface font-semibold">HTTPS</span> (deploy + SSL, atau tunnel seperti ngrok),
                lalu buka lagi halaman ini.
              </p>
            </div>
          ) : null}
          {cameraEnvIssue === 'unsupported' ? (
            <div className="border-outline-variant rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50">
              <p className="font-semibold">Peramban tidak mendukung akses kamera</p>
              <p className="text-on-surface-variant mt-1 leading-relaxed">
                Coba Chrome atau Firefox terbaru (bukan WebView terbatas / mode penyamaran). Anda tetap bisa
                memakai input manual di bawah.
              </p>
            </div>
          ) : null}
          <div
            className={cn(
              'border-outline-variant bg-surface-container-lowest ambient-shadow relative mx-auto min-h-[280px] w-full overflow-hidden rounded-xl border'
            )}
          >
            {/* Library owns #regionId; React children there would be wiped on reconcile. */}
            <div id={regionId} className="min-h-[280px] w-full" />
            {!scannerReady ? (
              <div className="bg-surface-container-lowest/92 pointer-events-none absolute inset-0 flex items-center justify-center p-8 backdrop-blur-[1px]">
                <p className="text-on-surface-variant max-w-sm text-center text-sm leading-relaxed">
                  {cameraEnvIssue === 'insecure' || cameraEnvIssue === 'unsupported'
                    ? 'Pratinjau kamera tidak tersedia di lingkungan ini. Gunakan HTTPS atau input manual.'
                    : cameraEnvIssue === 'denied'
                      ? 'Izin kamera ditolak untuk situs ini. Ubah di pengaturan browser lalu muat ulang, atau gunakan input manual.'
                      : cameraEnvIssue === 'policy'
                        ? 'Kamera tidak diizinkan oleh Permissions-Policy pada situs ini. Perbaiki header server lalu deploy ulang, atau gunakan input manual.'
                        : 'Menyiapkan kamera…'}
                </p>
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            onClick={() => void startScanner().catch((err: unknown) => handleCameraStartFailure(err))}
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
