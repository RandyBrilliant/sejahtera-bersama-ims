import { ArrowLeft } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'

import { AttendanceScanNoticeModal } from '@/components/admin/attendance/attendance-scan-notice-modal'
import { confirmAttendanceScan, previewAttendanceScan } from '@/api/attendance'
import { Button } from '@/components/ui/button'
import { USER_ROLE_LABEL } from '@/constants/user-roles'
import { useAttendanceQrScanner } from '@/hooks/use-attendance-qr-scanner'
import { alert } from '@/lib/alert'
import type { AttendanceConfirmResponse, AttendancePreviewResponse } from '@/types/attendance'

const SAME_QR_COOLDOWN_MS = 2500

type ScanResult = {
  preview: AttendancePreviewResponse
  confirm?: AttendanceConfirmResponse
  message?: string
}

type NoticeState = {
  title: string
  message: string
  preview: AttendancePreviewResponse
}

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

export function AdminAttendanceScanPage() {
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [processing, setProcessing] = useState(false)
  const lastRawRef = useRef<string | null>(null)
  const lastAtRef = useRef(0)

  const handleScan = useCallback(async (raw: string) => {
    const now = Date.now()
    if (raw === lastRawRef.current && now - lastAtRef.current < SAME_QR_COOLDOWN_MS) {
      return
    }

    setProcessing(true)
    try {
      const preview = await previewAttendanceScan(raw)

      if (preview.suggested_intent === 'done') {
        setNotice({
          title: 'Presensi sudah lengkap',
          message: 'Masuk dan pulang hari ini sudah tercatat untuk staf ini.',
          preview,
        })
        setLastResult({ preview, message: 'Presensi hari ini sudah lengkap.' })
        lastRawRef.current = raw
        lastAtRef.current = Date.now()
        return
      }

      if (preview.suggested_intent === 'check_in' && preview.already_checked_in_today) {
        setNotice({
          title: 'Sudah absen masuk',
          message: `${preview.full_name} sudah tercatat masuk hari ini.`,
          preview,
        })
        setLastResult({ preview })
        lastRawRef.current = raw
        lastAtRef.current = Date.now()
        return
      }

      if (preview.suggested_intent === 'check_out' && !preview.can_check_out) {
        setNotice({
          title: 'Belum bisa absen pulang',
          message:
            preview.checkout_blocked_reason ??
            'Minimal 1 jam setelah absen masuk sebelum dapat absen pulang.',
          preview,
        })
        setLastResult({ preview })
        lastRawRef.current = raw
        lastAtRef.current = Date.now()
        return
      }

      const intent =
        preview.suggested_intent === 'check_out' ? 'check_out' : 'check_in'
      const { payload, detail } = await confirmAttendanceScan(raw, intent)
      const checkedInAt = payload.checked_in_at ?? preview.checked_in_at ?? null

      setLastResult({
        preview: {
          ...preview,
          checked_in_at: checkedInAt,
          already_checked_in_today: true,
          already_checked_out_today:
            intent === 'check_out' ? true : preview.already_checked_out_today,
          checked_out_at: payload.checked_out_at ?? preview.checked_out_at ?? null,
          is_late: payload.is_late ?? preview.is_late,
          minutes_late: payload.minutes_late ?? preview.minutes_late,
        },
        confirm: payload,
        message: detail,
      })

      lastRawRef.current = raw
      lastAtRef.current = Date.now()
    } catch (e) {
      alert.error('Presensi gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setProcessing(false)
    }
  }, [])

  const { regionId, scannerReady, cameraEnvIssue, restartScanner } = useAttendanceQrScanner({
    onScan: handleScan,
  })

  const roleLabel =
    lastResult?.preview.role != null
      ? USER_ROLE_LABEL[lastResult.preview.role as keyof typeof USER_ROLE_LABEL] ??
        lastResult.preview.role
      : '—'

  return (
    <>
      <div className="attendance-scan-kiosk fixed inset-0 z-50 flex h-dvh flex-col bg-black">
        <div className="relative min-h-0 flex-1">
          <div className="absolute top-4 left-4 z-10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-white/25 bg-black/55 text-white hover:bg-black/75 hover:text-white"
              asChild
            >
              <Link to="/admin/dashboard">
                <ArrowLeft className="size-4" />
                Kembali
              </Link>
            </Button>
          </div>

          <div id={regionId} className="attendance-scan-region h-full w-full" />

          {!scannerReady ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/80 p-6">
              <p className="max-w-sm text-center text-sm leading-relaxed text-white/90">
                {cameraEnvIssue === 'insecure' || cameraEnvIssue === 'unsupported'
                  ? 'Kamera tidak tersedia di lingkungan ini. Gunakan HTTPS dan browser yang mendukung kamera.'
                  : cameraEnvIssue === 'denied'
                    ? 'Izin kamera ditolak. Ubah di pengaturan browser lalu muat ulang.'
                    : cameraEnvIssue === 'policy'
                      ? 'Kamera diblokir oleh kebijakan situs. Perbaiki Permissions-Policy server.'
                      : 'Menyiapkan kamera…'}
              </p>
            </div>
          ) : null}

          {processing ? (
            <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center">
              <span className="rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white">
                Memproses kartu…
              </span>
            </div>
          ) : null}
        </div>

        <section className="border-outline-variant bg-surface-container-lowest shrink-0 border-t px-4 py-5">
          {lastResult ? (
            <div className="space-y-1">
              <p className="text-on-surface text-xl font-semibold">{lastResult.preview.full_name}</p>
              <p className="text-on-surface-variant text-sm">{roleLabel}</p>
              <p className="text-on-surface mt-2 text-sm">
                <span className="text-on-surface-variant">Waktu masuk: </span>
                <span className="font-medium tabular-nums">
                  {fmtDt(lastResult.preview.checked_in_at)}
                </span>
              </p>
              {lastResult.preview.checked_out_at ? (
                <p className="text-on-surface text-sm">
                  <span className="text-on-surface-variant">Waktu pulang: </span>
                  <span className="font-medium tabular-nums">
                    {fmtDt(lastResult.preview.checked_out_at)}
                  </span>
                </p>
              ) : null}
              {lastResult.preview.is_late ? (
                <p className="text-destructive pt-1 text-xs font-medium">
                  Terlambat
                  {lastResult.preview.minutes_late != null
                    ? ` (+${lastResult.preview.minutes_late} menit)`
                    : ''}
                  {' — denda keterlambatan dikenakan pada payroll'}
                </p>
              ) : null}
              {lastResult.message ? (
                <p className="text-on-surface-variant pt-1 text-xs">{lastResult.message}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Arahkan QR kartu staf ke kamera. Nama, jabatan, dan waktu masuk akan muncul di sini
              setelah berhasil dipindai.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={restartScanner}>
              Nyalakan ulang kamera
            </Button>
          </div>
        </section>
      </div>

      <AttendanceScanNoticeModal
        open={!!notice}
        onOpenChange={(open) => {
          if (!open) setNotice(null)
        }}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        preview={notice?.preview ?? null}
      />
    </>
  )
}
