import { ArrowLeft, Camera } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'

import {
  AttendanceScanNoticeModal,
  type AttendanceScanNoticeVariant,
} from '@/components/admin/attendance/attendance-scan-notice-modal'
import { confirmAttendanceScan, previewAttendanceScan } from '@/api/attendance'
import { Button } from '@/components/ui/button'
import { useAttendanceQrScanner } from '@/hooks/use-attendance-qr-scanner'
import type { AttendancePreviewResponse } from '@/types/attendance'

const SAME_QR_COOLDOWN_MS = 2500
const NOTICE_AUTO_DISMISS_MS = 3000

type NoticeState = {
  title: string
  message: string
  preview?: AttendancePreviewResponse | null
  variant: AttendanceScanNoticeVariant
}

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  const detail = d?.detail
  return typeof detail === 'string' ? detail : undefined
}

function showNotice(
  setNotice: (n: NoticeState | null) => void,
  notice: NoticeState
) {
  setNotice(null)
  window.requestAnimationFrame(() => setNotice(notice))
}

export function AdminAttendanceScanPage() {
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [processing, setProcessing] = useState(false)
  const lastRawRef = useRef<string | null>(null)
  const lastAtRef = useRef(0)

  const showScanNotice = useCallback((next: NoticeState) => {
    showNotice(setNotice, next)
  }, [])

  const handleScan = useCallback(
    async (raw: string) => {
      const now = Date.now()
      if (raw === lastRawRef.current && now - lastAtRef.current < SAME_QR_COOLDOWN_MS) {
        return
      }

      setProcessing(true)
      try {
        const preview = await previewAttendanceScan(raw)

        if (preview.suggested_intent === 'done') {
          showScanNotice({
            title: 'Presensi sudah lengkap',
            message: 'Masuk dan pulang hari ini sudah tercatat untuk staf ini.',
            preview,
            variant: 'warning',
          })
          lastRawRef.current = raw
          lastAtRef.current = Date.now()
          return
        }

        if (preview.suggested_intent === 'check_in' && preview.already_checked_in_today) {
          showScanNotice({
            title: 'Sudah absen masuk',
            message: `${preview.full_name} sudah tercatat masuk hari ini.`,
            preview,
            variant: 'warning',
          })
          lastRawRef.current = raw
          lastAtRef.current = Date.now()
          return
        }

        if (preview.suggested_intent === 'check_out' && !preview.can_check_out) {
          showScanNotice({
            title: 'Belum bisa absen pulang',
            message:
              preview.checkout_blocked_reason ??
              'Minimal 1 jam setelah absen masuk sebelum dapat absen pulang.',
            preview,
            variant: 'warning',
          })
          lastRawRef.current = raw
          lastAtRef.current = Date.now()
          return
        }

        const intent =
          preview.suggested_intent === 'check_out' ? 'check_out' : 'check_in'
        const { payload, detail } = await confirmAttendanceScan(raw, intent)
        const checkedInAt = payload.checked_in_at ?? preview.checked_in_at ?? null

        showScanNotice({
          title: intent === 'check_in' ? 'Absen masuk berhasil' : 'Absen pulang berhasil',
          message: detail ?? 'Presensi tercatat.',
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
          variant: 'success',
        })

        lastRawRef.current = raw
        lastAtRef.current = Date.now()
      } catch (e) {
        showScanNotice({
          title: 'Presensi gagal',
          message: axiosDetail(e) ?? String((e as Error)?.message ?? e),
          variant: 'error',
        })
      } finally {
        setProcessing(false)
      }
    },
    [showScanNotice]
  )

  const handleCameraError = useCallback(
    (title: string, detail: string) => {
      showScanNotice({
        title,
        message: detail,
        variant: 'error',
      })
    },
    [showScanNotice]
  )

  const { regionId, scannerReady, cameraEnvIssue, restartScanner } = useAttendanceQrScanner({
    onScan: handleScan,
    onCameraError: handleCameraError,
  })

  const cameraOverlayMessage =
    cameraEnvIssue === 'insecure' || cameraEnvIssue === 'unsupported'
      ? 'Kamera tidak tersedia di lingkungan ini. Gunakan HTTPS dan browser yang mendukung kamera.'
      : cameraEnvIssue === 'denied'
        ? 'Izin kamera ditolak. Ubah di pengaturan browser lalu muat ulang.'
        : cameraEnvIssue === 'policy'
          ? 'Kamera diblokir oleh kebijakan situs. Perbaiki Permissions-Policy server.'
          : null

  return (
    <>
      <div className="attendance-scan-kiosk fixed inset-0 z-50 h-dvh bg-black">
        <div className="relative h-full w-full">
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-white/25 bg-black/55 text-white hover:bg-black/75 hover:text-white"
              onClick={restartScanner}
            >
              <Camera className="size-4" />
              Nyalakan ulang kamera
            </Button>
          </div>

          <div id={regionId} className="attendance-scan-region h-full w-full" />

          {!scannerReady ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/80 p-6">
              <p className="max-w-sm text-center text-sm leading-relaxed text-white/90">
                {cameraOverlayMessage ?? 'Menyiapkan kamera…'}
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
      </div>

      <AttendanceScanNoticeModal
        open={!!notice}
        onOpenChange={(open) => {
          if (!open) setNotice(null)
        }}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        preview={notice?.preview ?? null}
        variant={notice?.variant ?? 'warning'}
        autoDismissMs={NOTICE_AUTO_DISMISS_MS}
      />
    </>
  )
}
