import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'

import {
  fetchStaffAttendanceBadge,
  reissueStaffAttendanceBadge,
  revokeStaffAttendanceBadge,
  unrevokeStaffAttendanceBadge,
} from '@/api/attendance'
import { StaffBadgeReissueModal } from '@/components/admin/staff/staff-badge-reissue-modal'
import { downloadStaffIdCardJpg, StaffIdCardPreview } from '@/components/admin/staff/staff-id-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { alert } from '@/lib/alert'
import { cn } from '@/lib/utils'
import { isAxiosError } from 'axios'

type Props = {
  userId: number
  fullName: string
  positionLabel: string
  variant?: 'embedded' | 'standalone'
}

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  const detail = d?.detail
  return typeof detail === 'string' ? detail : undefined
}

export function StaffAttendanceBadgePanel({
  userId,
  fullName,
  positionLabel,
  variant = 'embedded',
}: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [printDataUrl, setPrintDataUrl] = useState<string | null>(null)
  const [revoked, setRevoked] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reissueOpen, setReissueOpen] = useState(false)
  const [reissueError, setReissueError] = useState<string | null>(null)

  const generateQrImages = useCallback(async (badgeToken: string) => {
    const [previewUrl, printUrl] = await Promise.all([
      QRCode.toDataURL(badgeToken, { width: 220, margin: 2 }),
      QRCode.toDataURL(badgeToken, { width: 512, margin: 1 }),
    ])
    setDataUrl(previewUrl)
    setPrintDataUrl(printUrl)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const b = await fetchStaffAttendanceBadge(userId)
      setRevoked(b.is_revoked)
      setToken(b.badge_token)
      if (b.is_revoked) {
        setDataUrl(null)
        setPrintDataUrl(null)
        return
      }
      await generateQrImages(b.badge_token)
    } catch {
      setDataUrl(null)
      setPrintDataUrl(null)
      setToken(null)
      alert.error('Badge presensi', 'Gagal memuat QR kartu. Coba muat ulang halaman.')
    } finally {
      setLoading(false)
    }
  }, [generateQrImages, userId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCopyToken() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      alert.success('Disalin', 'Token QR kartu telah disalin ke papan klip.')
    } catch {
      alert.error('Salin gagal', 'Salin secara manual.')
    }
  }

  function handleDownloadCardJpg() {
    if (!printDataUrl) {
      alert.error('Unduh JPG', 'QR kartu belum tersedia untuk diunduh.')
      return
    }
    void (async () => {
      const ok = await downloadStaffIdCardJpg({
        fullName,
        positionLabel,
        qrDataUrl: printDataUrl,
      })
      if (!ok) {
        alert.error('Unduh JPG', 'Gagal membuat file JPG kartu staf. Coba lagi.')
      }
    })()
  }

  async function handleRevoke() {
    setBusy(true)
    try {
      await revokeStaffAttendanceBadge(userId)
      alert.success('Kartu', 'Badge dinonaktifkan (revoke).')
      await load()
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  async function handleUnrevoke() {
    setBusy(true)
    try {
      await unrevokeStaffAttendanceBadge(userId)
      alert.success('Kartu', 'Badge diaktifkan kembali.')
      await load()
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  function openReissueModal() {
    setReissueError(null)
    setReissueOpen(true)
  }

  async function handleConfirmReissue() {
    setBusy(true)
    setReissueError(null)
    try {
      const b = await reissueStaffAttendanceBadge(userId)
      setReissueOpen(false)
      alert.success(
        'Kartu baru',
        'Kartu presensi telah diterbitkan ulang. Cetak kartu fisik baru atau salin token yang baru.'
      )
      setRevoked(b.is_revoked)
      setToken(b.badge_token)
      await generateQrImages(b.badge_token)
    } catch (e) {
      setReissueError(axiosDetail(e) ?? 'Gagal menerbitkan ulang kartu. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const content = (
    <>
      {loading ? (
        <p className="text-on-surface-variant text-sm">Memuat QR…</p>
      ) : revoked ? (
        <div className="space-y-3">
          <p className="text-destructive text-sm">Badge ini dinonaktifkan (dicabut).</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleUnrevoke()}>
              Aktifkan kembali
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={openReissueModal}>
              Terbitkan ulang kartu
            </Button>
          </div>
        </div>
      ) : dataUrl ? (
        <div className="space-y-4">
          {variant === 'standalone' ? (
            <div className="space-y-3">
              <h3 className="text-on-surface text-sm font-semibold">Pratinjau kartu staf</h3>
              <StaffIdCardPreview
                fullName={fullName}
                positionLabel={positionLabel}
                qrDataUrl={dataUrl}
              />
              <p className="text-on-surface-variant text-xs leading-relaxed">
                Unduh JPG dengan ukuran tetap kartu ID vertikal (CR80, 54 × 86 mm) untuk dicetak.
              </p>
            </div>
          ) : (
            <img
              src={dataUrl}
              alt="Kode QR token presensi staf"
              className={cn('rounded-lg border')}
            />
          )}

          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs tracking-tight">
                {token ?? '—'}
              </Badge>
              <button
                type="button"
                className="text-primary text-xs font-semibold underline"
                onClick={() => void handleCopyToken()}
              >
                Salin token
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {variant === 'standalone' ? (
                <Button type="button" disabled={busy || !printDataUrl} onClick={handleDownloadCardJpg}>
                  Unduh JPG kartu
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleRevoke()}>
                Cabut akses kartu
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={openReissueModal}>
                Terbitkan ulang
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-on-surface-variant text-sm">QR tidak tersedia.</p>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void load()}>
            Muat ulang
          </Button>
        </div>
      )}
    </>
  )

  const panel = variant === 'standalone' ? (
    <Card className="border-outline-variant bg-surface-container-lowest ambient-shadow max-w-2xl border shadow-none">
      <CardHeader className="border-outline-variant border-b pb-4">
        <CardTitle className="font-heading text-lg">Cetak kartu staf</CardTitle>
        <CardDescription className="text-on-surface-variant">
          Kartu fisik berisi QR presensi. Admin memindai kartu dengan tablet dan memastikan orang di depan
          sama dengan nama sebelum menyetujui.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">{content}</CardContent>
    </Card>
  ) : (
    <section className="border-outline-variant border-t pt-4">
      <h2 className="text-on-surface mb-3 text-sm font-semibold tracking-wide uppercase">
        Kartu presensi (QR)
      </h2>
      <p className="text-on-surface-variant mb-4 text-xs leading-relaxed">
        Kartu cetak fisik menyandikan token di bawah. Admin memindai kartu dengan tablet dan memastikan orang
        di depan sama dengan nama sebelum menyetujui.
      </p>
      {content}
    </section>
  )

  return (
    <>
      {panel}
      <StaffBadgeReissueModal
        open={reissueOpen}
        onOpenChange={setReissueOpen}
        staffName={fullName}
        pending={busy}
        errorMessage={reissueError}
        onConfirm={() => void handleConfirmReissue()}
      />
    </>
  )
}
