import { ExternalLink, QrCode } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const PUBLIC_KIOSK_PATH = '/absensi'

export function AdminAttendanceTabletPage() {
  const publicUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${PUBLIC_KIOSK_PATH}`
      : PUBLIC_KIOSK_PATH

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Presensi tablet
        </h2>
        <p className="text-on-surface-variant mt-2 text-sm leading-relaxed">
          Gunakan mode pemindai kamera untuk mencatat masuk dan pulang staf. Setelah QR terbaca,
          nama, jabatan, dan waktu masuk langsung ditampilkan — tanpa konfirmasi tambahan.
        </p>
      </div>

      <Card className="border-outline-variant bg-surface-container-lowest ambient-shadow border shadow-none">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Kiosk publik (tanpa login)</CardTitle>
          <CardDescription className="text-on-surface-variant">
            Buka URL ini di tablet pintu masuk. Kamera aktif otomatis — staf cukup tunjukkan kartu
            QR, tanpa masuk ke akun admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button type="button" size="lg" className="w-full gap-2 sm:w-auto" asChild>
            <a href={PUBLIC_KIOSK_PATH} target="_blank" rel="noreferrer">
              <ExternalLink className="size-5" />
              Buka kiosk publik
            </a>
          </Button>
          <p className="text-on-surface-variant font-mono text-xs break-all">{publicUrl}</p>
        </CardContent>
      </Card>

      <Card className="border-outline-variant bg-surface-container-lowest ambient-shadow border shadow-none">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Pemindai admin (login)</CardTitle>
          <CardDescription className="text-on-surface-variant">
            Mode lama untuk admin yang sudah masuk — hasil scan tercatat atas nama Anda sebagai
            verifikator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" size="lg" variant="outline" className="w-full gap-2 sm:w-auto" asChild>
            <Link to="/admin/absensi/scan">
              <QrCode className="size-5" />
              Buka pemindai admin
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
