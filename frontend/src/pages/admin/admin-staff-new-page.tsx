import { Link, useNavigate } from 'react-router-dom'

import { StaffUserForm } from '@/components/admin/staff/staff-user-form'
import { useAuth } from '@/hooks/use-auth'

export function AdminStaffNewPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const actorRole = user?.role ?? 'ADMIN'

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/staf"
          className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
        >
          ← Kembali ke daftar
        </Link>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Tambah pengguna
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Buat akun internal baru. Setelah disimpan Anda akan dikembalikan ke daftar pengguna. Metadata
          lengkap (ID, audit, profil karyawan jika ada) dapat Anda lihat saat mengedit pengguna.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start lg:gap-10">
        <StaffUserForm
          key="create"
          mode="create"
          initialUser={null}
          actorRole={actorRole}
          onCancel={() => navigate('/admin/staf')}
          onSaved={() => navigate('/admin/staf')}
        />
        <aside className="border-outline-variant bg-surface-container-lowest ambient-shadow lg:sticky lg:top-20 rounded-xl border p-6">
          <h2 className="text-on-surface mb-3 text-sm font-semibold tracking-wide uppercase">
            Informasi
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            ID pengguna, tanggal bergabung, nomor telepon di server, status, serta riwayat audit dan profil
            karyawan (jika terhubung) ditampilkan di panel kanan pada halaman edit pengguna.
          </p>
        </aside>
      </div>
    </div>
  )
}
