import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'

import {
  fetchStaffAttendanceBadge,
  reissueStaffAttendanceBadge,
  revokeStaffAttendanceBadge,
  unrevokeStaffAttendanceBadge,
} from '@/api/attendance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { alert } from '@/lib/alert'
import { cn } from '@/lib/utils'
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

export function StaffAttendanceBadgePanel({ userId }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [revoked, setRevoked] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const b = await fetchStaffAttendanceBadge(userId)
      setRevoked(b.is_revoked)
      setToken(b.badge_token)
      if (b.is_revoked) {
        setDataUrl(null)
        return
      }
      const url = await QRCode.toDataURL(b.badge_token, { width: 220, margin: 2 })
      setDataUrl(url)
    } catch {
      setDataUrl(null)
      setToken(null)
      alert.error('Badge presensi', 'Gagal memuat QR kartu. Coba muat ulang halaman.')
    } finally {
      setLoading(false)
    }
  }, [userId])

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

  async function handleReissue() {
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(
            'Keluarkan ulang kartu? Token akan berubah dan QR lama tidak akan lagi berlaku untuk presensi.'
          )
        : true
    if (!ok) return
    setBusy(true)
    try {
      const b = await reissueStaffAttendanceBadge(userId)
      alert.success(
        'Kartu baru',
        'Badge dikeluarkan ulang — cetak ulang kartu fisik atau salin token baru.'
      )
      setRevoked(b.is_revoked)
      setToken(b.badge_token)
      const url = await QRCode.toDataURL(b.badge_token, { width: 220, margin: 2 })
      setDataUrl(url)
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border-outline-variant border-t pt-4">
      <h2 className="text-on-surface mb-3 text-sm font-semibold tracking-wide uppercase">
        Kartu presensi (QR)
      </h2>
      <p className="text-on-surface-variant mb-4 text-xs leading-relaxed">
        Kartu cetak fisik menyandikan token di bawah. Admin memindai kartu dengan tablet dan memastikan orang
        di depan sama dengan nama sebelum menyetujui.
      </p>
      {loading ? (
        <p className="text-on-surface-variant text-sm">Memuat QR…</p>
      ) : revoked ? (
        <div className="space-y-3">
          <p className="text-destructive text-sm">Badge ini dinonaktifkan (dicabut).</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleUnrevoke()}>
              Aktifkan kembali
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleReissue()}>
              Keluaran ulang (token baru)
            </Button>
          </div>
        </div>
      ) : dataUrl ? (
        <div className="flex flex-col items-start gap-3">
          <img
            src={dataUrl}
            alt="Kode QR token presensi staf"
            className={cn('rounded-lg border')}
          />
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
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleRevoke()}>
              Cabut akses kartu
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void handleReissue()}>
              Keluaran ulang
            </Button>
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
    </section>
  )
}
