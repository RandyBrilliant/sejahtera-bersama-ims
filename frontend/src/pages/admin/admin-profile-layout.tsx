import { Outlet } from 'react-router-dom'

import { ProfileSubnav } from '@/components/admin/profile/profile-subnav'

export function AdminProfileLayout() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Profil
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Kelola akun Anda, lihat riwayat presensi pribadi, dan cek slip gaji Anda.
        </p>
      </div>

      <ProfileSubnav />

      <Outlet />
    </div>
  )
}
