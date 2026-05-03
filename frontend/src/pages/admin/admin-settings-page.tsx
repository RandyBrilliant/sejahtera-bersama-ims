import { ChevronRight, Info, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

import { QuickActionsCardGrid } from '@/components/dashboard/admin/admin-quick-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const IMS_VERSION = '1.0.0'

type SettingLinkProps = {
  to: string
  title: string
  subtitle: string
}

function SettingLink({ to, title, subtitle }: SettingLinkProps) {
  return (
    <Link
      to={to}
      className="border-outline-variant hover:bg-surface-container-low focus-visible:ring-primary/30 flex items-center justify-between gap-3 rounded-lg border bg-transparent px-3 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="min-w-0">
        <span className="text-on-surface block text-sm font-medium">{title}</span>
        <span className="text-on-surface-variant block text-xs">{subtitle}</span>
      </span>
      <ChevronRight className="text-on-surface-variant size-4 shrink-0" aria-hidden />
    </Link>
  )
}

/**
 * Halaman pengaturan admin: struktur mengacu praktik umum ERP/IMS (akun, master data, org,
 * integrasi, tentang). Yang belum ada API disiapkan sebagai placeholder penjelasan.
 */
export function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          Pengaturan
        </h1>
        <p className="text-on-surface-variant mt-1 max-w-2xl text-sm">
          Pusat konfigurasi untuk admin dan pimpinan. Bagian di bawah mengikuti urutan yang biasa
          dipakai di sistem inventaris & keuangan: akses dulu, lalu master data, organisasi,
          integrasi, lalu informasi aplikasi.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-start gap-2">
          <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <h2 className="text-on-surface text-sm font-semibold">Aksi cepat</h2>
            <p className="text-on-surface-variant text-xs">
              Rekomendasi industri: sediakan pintasan konsisten ke transaksi harian (SO/PO, kas,
              stok) dari satu tempat — identik dengan menu kotak di header.
            </p>
          </div>
        </div>
        <QuickActionsCardGrid />
      </section>

      <Separator className="bg-outline-variant" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-outline-variant bg-surface-container-lowest">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="text-primary size-5" aria-hidden />
              <CardTitle className="text-base">Akun & keamanan</CardTitle>
            </div>
            <CardDescription>
              Rekomendasi: kelola pengguna, peran, dan kata sandi dari area terpisah; profil untuk
              data diri pengguna yang sedang masuk.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <SettingLink
              to="/admin/profil"
              title="Profil saya"
              subtitle="Nama, kontak, ubah sandi"
            />
            <SettingLink
              to="/admin/staf"
              title="Pengguna & staf"
              subtitle="Undang, peran, aktivasi akun"
            />
          </CardContent>
        </Card>

        <Card className="border-outline-variant bg-surface-container-lowest">
          <CardHeader>
            <CardTitle className="text-base">Master data & operasi</CardTitle>
            <CardDescription>
              Titik masuk ke data referensi yang mempengaruhi transaksi (pelanggan, kas, produk).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <SettingLink to="/admin/pelanggan" title="Pelanggan" subtitle="Daftar & harga khusus" />
            <SettingLink
              to="/admin/kas/kategori"
              title="Kategori kas operasional"
              subtitle="Struktur pemasukan & pengeluaran"
            />
            <SettingLink to="/admin/inventaris" title="Inventaris produk" subtitle="SKU & kemasan" />
            <SettingLink
              to="/admin/gudang/bahan-baku"
              title="Bahan baku"
              subtitle="Resep & stok bahan"
            />
          </CardContent>
        </Card>

        <Card className="border-outline-variant bg-surface-container-lowest">
          <CardHeader>
            <CardTitle className="text-base">Organisasi & wilayah</CardTitle>
            <CardDescription>
              Pada sistem enterprise biasanya: nama perusahaan, zona waktu, format tanggal & mata
              uang. Berikut placeholder hingga API pengaturan organisasi tersedia.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-on-surface-variant space-y-2 text-sm">
            <p>
              <span className="text-on-surface font-medium">Zona waktu:</span> mengikuti server /
              browser (tanpa penyimpanan saat ini).
            </p>
            <p>
              <span className="text-on-surface font-medium">Mata uang:</span> IDR — penyimpanan
              preferensi organisasi dapat ditambahkan kemudian.
            </p>
          </CardContent>
        </Card>

        <Card className="border-outline-variant bg-surface-container-lowest">
          <CardHeader>
            <CardTitle className="text-base">Integrasi & ekspor</CardTitle>
            <CardDescription>
              Pola umum: webhook, API key, sinkronisasi akuntansi. Belum diaktifkan pada rilis ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-on-surface-variant text-sm">
            <p>
              Gunakan laporan dari menu{' '}
              <Link to="/admin/analitik" className="text-primary font-medium underline-offset-4 hover:underline">
                Analitik
              </Link>{' '}
              untuk CSV/PDF kas; integrasi pihak ketiga dapat ditambah per kebutuhan bisnis.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-outline-variant bg-surface-container-lowest">
        <CardHeader>
          <CardTitle className="text-base">Tentang aplikasi</CardTitle>
          <CardDescription>Informasi build untuk dukungan & audit internal.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <dl className="space-y-1 text-sm">
            <div>
              <dt className="text-on-surface-variant text-xs uppercase">Nama</dt>
              <dd className="text-on-surface font-medium">Sejahtera Bersama IMS</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs uppercase">Versi UI</dt>
              <dd className="text-on-surface font-mono text-sm">{IMS_VERSION}</dd>
            </div>
          </dl>
          <p className="text-on-surface-variant max-w-sm text-xs">
            Referensi API dan panduan operasi disimpan oleh tim pengembangan (biasanya Wiki atau
            repositori internal).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
