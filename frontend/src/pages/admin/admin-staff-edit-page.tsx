import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'

import { StaffAttendanceBadgePanel } from '@/components/admin/staff/staff-attendance-badge-panel'
import { StaffCompensationPanel } from '@/components/admin/staff/staff-compensation-panel'
import { StaffUserDetailSubnav, type StaffDetailTab } from '@/components/admin/staff/staff-user-detail-subnav'
import { StaffUserMetadataAside } from '@/components/admin/staff/staff-user-metadata-aside'
import { StaffUserForm } from '@/components/admin/staff/staff-user-form'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { USER_ROLE_LABEL } from '@/constants/user-roles'
import { useAuth } from '@/hooks/use-auth'
import { useSystemUserQuery } from '@/hooks/use-system-users-query'
import { useGoBack } from '@/hooks/use-go-back'

const LIST_PATH = '/admin/staf'

export function AdminStaffEditPage() {
  const goBack = useGoBack()
  const { id: idParam } = useParams<{ id: string }>()
  const { user: authUser } = useAuth()
  const actorRole = authUser?.role ?? 'ADMIN'
  const [activeTab, setActiveTab] = useState<StaffDetailTab>('profile')

  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0

  const { data: user, isLoading, isError } = useSystemUserQuery(validId ? id : null)

  if (!validId) {
    return <Navigate to={LIST_PATH} replace />
  }

  if (isLoading) {
    return (
      <p className="text-on-surface-variant text-sm">Memuat data pengguna…</p>
    )
  }

  if (isError || !user) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={LIST_PATH} className="mb-0">
          ← Kembali ke daftar
        </PageBackLink>
        <p className="text-destructive text-sm">Pengguna tidak ditemukan.</p>
      </div>
    )
  }

  const positionLabel = USER_ROLE_LABEL[user.role] ?? user.role

  return (
    <div className="space-y-6">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke daftar</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Detail pengguna
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Mengelola <span className="text-on-surface font-medium">{user.full_name}</span> (
          {user.username}). Gunakan tab di bawah untuk mengedit profil, mengisi gaji pokok, atau mencetak
          kartu staf.
        </p>
      </div>

      <StaffUserDetailSubnav active={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start lg:gap-10">
          <StaffUserForm
            key={user.id}
            mode="edit"
            initialUser={user}
            actorRole={actorRole}
            onCancel={() => goBack(LIST_PATH)}
            onSaved={() => goBack(LIST_PATH)}
          />
          <StaffUserMetadataAside user={user} />
        </div>
      ) : null}

      {activeTab === 'compensation' ? (
        <StaffCompensationPanel userId={user.id} variant="standalone" />
      ) : null}

      {activeTab === 'card' ? (
        <StaffAttendanceBadgePanel
          userId={user.id}
          fullName={user.full_name}
          positionLabel={positionLabel}
          variant="standalone"
        />
      ) : null}
    </div>
  )
}
