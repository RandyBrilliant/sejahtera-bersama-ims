import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { StaffUserMetadataAside } from '@/components/admin/staff/staff-user-metadata-aside'
import { StaffUserForm } from '@/components/admin/staff/staff-user-form'
import { useAuth } from '@/hooks/use-auth'
import { useSystemUserQuery } from '@/hooks/use-system-users-query'

export function AdminStaffEditPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const actorRole = authUser?.role ?? 'ADMIN'

  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: user, isLoading, isError } = useSystemUserQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to="/admin/staf" replace />
  }

  if (isLoading) {
    return (
      <p className="text-on-surface-variant text-sm">Memuat data pengguna…</p>
    )
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/staf"
          className="text-on-surface-variant hover:text-primary inline-block text-sm font-medium"
        >
          ← Kembali ke daftar
        </Link>
        <p className="text-destructive text-sm">Pengguna tidak ditemukan.</p>
      </div>
    )
  }

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
          Edit pengguna
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Mengubah <span className="text-on-surface font-medium">{user.username}</span>. Username tidak
          dapat diubah. Metadata di samping menampilkan nilai tersimpan di server.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start lg:gap-10">
        <StaffUserForm
          key={user.id}
          mode="edit"
          initialUser={user}
          actorRole={actorRole}
          onCancel={() => navigate('/admin/staf')}
          onSaved={() => navigate('/admin/staf')}
        />
        <StaffUserMetadataAside user={user} />
      </div>
    </div>
  )
}
