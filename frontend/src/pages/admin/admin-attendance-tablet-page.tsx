import { QrCode } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AdminAttendanceTabletPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Presensi tablet (admin)
        </h2>
        <p className="text-on-surface-variant mt-2 text-sm leading-relaxed">
          Gunakan mode pemindai kamera untuk mencatat masuk dan pulang staf. Setelah QR terbaca,
          nama, jabatan, dan waktu masuk langsung ditampilkan di bawah kamera — tanpa konfirmasi
          tambahan.
        </p>
      </div>

      <Card className="border-outline-variant bg-surface-container-lowest ambient-shadow border shadow-none">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Pemindai kamera</CardTitle>
          <CardDescription className="text-on-surface-variant">
            Halaman khusus layar penuh untuk tablet di pintu masuk. Kamera tetap aktif setelah
            setiap pindai.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" size="lg" className="w-full gap-2 sm:w-auto" asChild>
            <Link to="/admin/absensi/scan">
              <QrCode className="size-5" />
              Buka pemindai kamera
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
