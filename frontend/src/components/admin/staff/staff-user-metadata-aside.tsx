import { USER_ROLE_LABEL } from '@/constants/user-roles'
import { formatAuditDateTime } from '@/lib/format-audit-datetime'
import { formatRegionalPhonePreview } from '@/lib/regional-phone'
import type { SystemUser } from '@/types/system-user'

export function StaffUserMetadataAside({ user }: { user: SystemUser }) {
  const emp = user.employee_profile

  return (
    <aside className="border-outline-variant bg-surface-container-lowest ambient-shadow lg:sticky lg:top-20 space-y-4 rounded-xl border p-6">
      <div>
        <h2 className="text-on-surface mb-4 text-sm font-semibold tracking-wide uppercase">
          Metadata akun
        </h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">ID pengguna</dt>
            <dd className="text-on-surface mt-0.5 font-mono">{user.id}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Username</dt>
            <dd className="text-on-surface mt-0.5">{user.username}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Nama lengkap</dt>
            <dd className="text-on-surface mt-0.5 min-w-0 break-words">{user.full_name}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Peran</dt>
            <dd className="text-on-surface mt-0.5">
              {USER_ROLE_LABEL[user.role] ?? user.role}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Status</dt>
            <dd className="text-on-surface mt-0.5">{user.is_active ? 'Aktif' : 'Nonaktif'}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">
              Nomor telepon (server)
            </dt>
            <dd className="text-on-surface mt-0.5 min-w-0 break-words">
              {formatRegionalPhonePreview(user.phone_number ?? '')}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">
              Tanggal bergabung (akun)
            </dt>
            <dd className="text-on-surface mt-0.5">{formatAuditDateTime(user.date_joined)}</dd>
          </div>
        </dl>
      </div>

      {emp ? (
        <div className="border-outline-variant border-t pt-4">
          <h2 className="text-on-surface mb-4 text-sm font-semibold tracking-wide uppercase">
            Profil karyawan
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-on-surface-variant text-xs font-medium uppercase">ID profil</dt>
              <dd className="text-on-surface mt-0.5 font-mono">{emp.id}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs font-medium uppercase">
                Kode karyawan
              </dt>
              <dd className="text-on-surface mt-0.5 font-mono">{emp.employee_code}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs font-medium uppercase">
                Tanggal masuk kerja
              </dt>
              <dd className="text-on-surface mt-0.5">
                {formatAuditDateTime(emp.joined_date)}
              </dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs font-medium uppercase">
                Profil dibuat
              </dt>
              <dd className="text-on-surface mt-0.5">{formatAuditDateTime(emp.created_at)}</dd>
            </div>
            <div>
              <dt className="text-on-surface-variant text-xs font-medium uppercase">
                Profil diubah
              </dt>
              <dd className="text-on-surface mt-0.5">{formatAuditDateTime(emp.updated_at)}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="border-outline-variant border-t pt-4">
        <h2 className="text-on-surface mb-4 text-sm font-semibold tracking-wide uppercase">Audit</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Dibuat</dt>
            <dd className="text-on-surface mt-0.5">{formatAuditDateTime(user.created_at)}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">
              Terakhir diubah
            </dt>
            <dd className="text-on-surface mt-0.5">{formatAuditDateTime(user.updated_at)}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">
              Login terakhir
            </dt>
            <dd className="text-on-surface mt-0.5">{formatAuditDateTime(user.last_login)}</dd>
          </div>
        </dl>
      </div>
    </aside>
  )
}
