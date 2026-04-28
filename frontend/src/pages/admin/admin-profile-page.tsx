import { useState } from 'react'

import { changePassword, updateMe } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RegionalPhoneInput } from '@/components/ui/regional-phone-input'
import { formatRegionalPhonePreview } from '@/lib/regional-phone'
import { useAuth } from '@/hooks/use-auth'
import { alert } from '@/lib/alert'
import { formatAuditDateTime } from '@/lib/format-audit-datetime'
import type { User, UserRole } from '@/types/auth'

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  LEADERSHIP: 'Pimpinan',
  WAREHOUSE_STAFF: 'Staf gudang',
  SALES_STAFF: 'Staf penjualan',
  FINANCE_STAFF: 'Staf keuangan',
}

function parseAxiosErrors(err: unknown): {
  detail?: string
  errors?: Record<string, string[]>
} {
  const ax = err as {
    response?: { data?: { detail?: string; errors?: Record<string, string[]> } }
  }
  return {
    detail: ax.response?.data?.detail,
    errors: ax.response?.data?.errors,
  }
}

function ProfileMetadataAside({ user }: { user: User }) {
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
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Peran</dt>
            <dd className="text-on-surface mt-0.5">{ROLE_LABEL[user.role] ?? user.role}</dd>
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
        </dl>
      </div>

      <div className="border-outline-variant border-t pt-4">
        <h2 className="text-on-surface mb-4 text-sm font-semibold tracking-wide uppercase">
          Audit
        </h2>
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

function ProfileEditForm({
  user,
  onSaved,
}: {
  user: User
  onSaved: () => Promise<void>
}) {
  const [fullName, setFullName] = useState(user.full_name ?? '')
  const [phone, setPhone] = useState(user.phone_number ?? '')
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [profileFieldErrors, setProfileFieldErrors] = useState<{
    full_name?: string
    phone_number?: string
  }>({})

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileFieldErrors({})
    const next: Partial<{ full_name: string; phone_number: string }> = {}
    if (fullName.trim() !== (user.full_name ?? '').trim()) {
      next.full_name = fullName.trim()
    }
    const prevPhone = (user.phone_number ?? '').trim()
    const nextPhone = phone.trim()
    if (nextPhone !== prevPhone) {
      next.phone_number = nextPhone
    }
    if (Object.keys(next).length === 0) {
      alert.info('Tidak ada perubahan', 'Ubah nama atau nomor telepon terlebih dahulu.')
      return
    }

    setProfileSubmitting(true)
    try {
      await updateMe(next)
      await onSaved()
      alert.success('Profil diperbarui', 'Perubahan berhasil disimpan.')
    } catch (err) {
      const { detail, errors } = parseAxiosErrors(err)
      const fe: typeof profileFieldErrors = {}
      if (errors?.full_name?.[0]) fe.full_name = errors.full_name[0]
      if (errors?.phone_number?.[0]) fe.phone_number = errors.phone_number[0]
      setProfileFieldErrors(fe)
      alert.error(
        'Gagal menyimpan',
        detail ?? 'Periksa data yang Anda masukkan dan coba lagi.'
      )
    } finally {
      setProfileSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleProfileSave} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">Data yang dapat diedit</CardTitle>
          <CardDescription>
            Nama lengkap dan nomor telepon disimpan di server dan dapat Anda ubah di sini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="profile-full-name">Nama lengkap</Label>
            <Input
              id="profile-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={profileSubmitting}
              autoComplete="name"
            />
            {profileFieldErrors.full_name ? (
              <p className="text-destructive text-xs">{profileFieldErrors.full_name}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Nomor telepon</Label>
            <RegionalPhoneInput
              id="profile-phone"
              value={phone}
              onChange={setPhone}
              disabled={profileSubmitting}
              error={profileFieldErrors.phone_number}
              className="text-on-surface"
            />
          </div>
        </CardContent>
      </Card>
      <Button type="submit" disabled={profileSubmitting}>
        {profileSubmitting ? 'Menyimpan…' : 'Simpan profil'}
      </Button>
    </form>
  )
}

export function AdminProfilePage() {
  const { user, refreshUser } = useAuth()

  if (!user) {
    return (
      <p className="text-on-surface-variant text-sm">
        Memuat data pengguna…
      </p>
    )
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Profil
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Kelola informasi akun Anda dan ubah kata sandi. Username dan peran dikelola oleh administrator.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start lg:gap-10">
        <div className="space-y-8">
          <ProfileEditForm
            key={`${user.id}-${user.full_name}-${user.phone_number ?? ''}-${user.updated_at ?? ''}`}
            user={user}
            onSaved={refreshUser}
          />
          <ChangePasswordBlock />
        </div>
        <ProfileMetadataAside user={user} />
      </div>
    </div>
  )
}

function ChangePasswordBlock() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{
    current?: string
    new?: string
    confirm?: string
    global?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!currentPassword) {
      setErrors((prev) => ({ ...prev, current: 'Password lama wajib diisi.' }))
      return
    }
    if (!newPassword) {
      setErrors((prev) => ({ ...prev, new: 'Password baru wajib diisi.' }))
      return
    }
    if (newPassword.length < 8) {
      setErrors((prev) => ({ ...prev, new: 'Password minimal 8 karakter.' }))
      return
    }
    if (newPassword === currentPassword) {
      setErrors((prev) => ({
        ...prev,
        new: 'Password baru tidak boleh sama dengan password lama.',
      }))
      return
    }
    if (newPassword !== confirmPassword) {
      setErrors((prev) => ({ ...prev, confirm: 'Konfirmasi password tidak sama.' }))
      return
    }

    setIsSubmitting(true)
    try {
      await changePassword({
        old_password: currentPassword,
        new_password: newPassword,
      })
      alert.success('Kata sandi diperbarui', 'Password akun Anda telah berhasil diubah.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data as
        | {
            detail?: string
            errors?: { old_password?: string[]; new_password?: string[] }
          }
        | undefined

      const fieldErrors = data?.errors
      const nextErrors: typeof errors = {}
      if (fieldErrors?.old_password?.[0]) {
        nextErrors.current = String(fieldErrors.old_password[0])
      }
      if (fieldErrors?.new_password?.[0]) {
        nextErrors.new = String(fieldErrors.new_password[0])
      }
      if (!nextErrors.current && !nextErrors.new) {
        nextErrors.global =
          data?.detail ??
          (err instanceof Error ? err.message : 'Gagal mengubah password. Coba lagi nanti.')
      }
      setErrors(nextErrors)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">Ubah kata sandi</CardTitle>
          <CardDescription>
            Ganti kata sandi secara berkala demi keamanan akun.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {errors.global ? (
            <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-xs">
              {errors.global}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="current-password">
              Password lama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.current ? (
              <p className="text-destructive text-xs">{errors.current}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">
              Password baru <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.new ? <p className="text-destructive text-xs">{errors.new}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">
              Konfirmasi password baru <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.confirm ? (
              <p className="text-destructive text-xs">{errors.confirm}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Menyimpan…' : 'Simpan password baru'}
      </Button>
    </form>
  )
}
