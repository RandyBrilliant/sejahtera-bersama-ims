import { useState } from 'react'
import { format } from 'date-fns'

import {
  manageableRolesForActor,
  USER_ROLE_LABEL,
} from '@/constants/user-roles'
import {
  useCreateSystemUserMutation,
  useResetSystemUserPasswordMutation,
  useUpdateSystemUserMutation,
} from '@/hooks/use-system-users-query'
import { alert } from '@/lib/alert'
import { generateTempPassword } from '@/lib/generate-temp-password'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RegionalPhoneInput } from '@/components/ui/regional-phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserRole } from '@/types/auth'
import type { SystemUser } from '@/types/system-user'

import { parseStaffUserMutationError } from '@/components/admin/staff/staff-user-mutation-error'

function todayIsoDate() {
  return format(new Date(), 'yyyy-MM-dd')
}

function pickDefaultRole(choices: UserRole[]): UserRole {
  if (choices.includes('WAREHOUSE_STAFF')) return 'WAREHOUSE_STAFF'
  return choices[0] ?? 'WAREHOUSE_STAFF'
}

type StaffUserFormProps = {
  mode: 'create' | 'edit'
  /** Untuk mode edit: data dari GET (setelah loading). */
  initialUser: SystemUser | null
  actorRole: UserRole
  onCancel: () => void
  onSaved: () => void
}

export function StaffUserForm({
  mode,
  initialUser,
  actorRole,
  onCancel,
  onSaved,
}: StaffUserFormProps) {
  const roles = manageableRolesForActor(actorRole)

  const [username, setUsername] = useState(
    mode === 'edit' && initialUser ? initialUser.username : ''
  )
  const [fullName, setFullName] = useState(
    mode === 'edit' && initialUser ? initialUser.full_name : ''
  )
  const [phone, setPhone] = useState(
    mode === 'edit' && initialUser ? initialUser.phone_number ?? '' : ''
  )
  const [role, setRole] = useState<UserRole>(
    mode === 'edit' && initialUser ? initialUser.role : pickDefaultRole(roles)
  )
  const [joinedDate, setJoinedDate] = useState(
    mode === 'edit' && initialUser?.employee_profile?.joined_date
      ? initialUser.employee_profile.joined_date
      : todayIsoDate()
  )
  const [tempPassword, setTempPassword] = useState(() =>
    mode === 'create' ? generateTempPassword() : ''
  )
  const [resetPassword, setResetPassword] = useState(() =>
    mode === 'edit' ? generateTempPassword() : ''
  )

  const createMutation = useCreateSystemUserMutation()
  const updateMutation = useUpdateSystemUserMutation(initialUser?.id ?? 0)
  const resetPasswordMutation = useResetSystemUserPasswordMutation()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'create') {
      if (!username.trim()) {
        alert.error('Validasi', 'Username wajib diisi.')
        return
      }
      if (!fullName.trim()) {
        alert.error('Validasi', 'Nama lengkap wajib diisi.')
        return
      }
      if (!tempPassword.trim()) {
        alert.error('Validasi', 'Password sementara wajib diisi.')
        return
      }

      try {
        const trimmedUsername = username.trim()
        await createMutation.mutateAsync({
          username: trimmedUsername,
          password: tempPassword,
          full_name: fullName.trim(),
          role,
          phone_number: phone.trim() || undefined,
          joined_date: joinedDate.trim() || null,
        })
        alert.success('Berhasil', 'Pengguna berhasil dibuat.')
        alert.info(
          'Password sementara',
          `Berikan password ini kepada pengguna (sekali tampil): ${tempPassword}`
        )
        onSaved()
      } catch (err) {
        alert.error('Gagal menyimpan', parseStaffUserMutationError(err))
      }
      return
    }

    if (!initialUser) return

    try {
      await updateMutation.mutateAsync({
        full_name: fullName.trim(),
        role,
        phone_number: phone.trim(),
        joined_date: joinedDate.trim() || null,
      })
      alert.success('Berhasil', 'Perubahan disimpan.')
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parseStaffUserMutationError(err))
    }
  }

  async function handleResetPassword() {
    if (mode !== 'edit' || !initialUser) return
    if (!resetPassword.trim()) {
      alert.error('Validasi', 'Password sementara wajib diisi.')
      return
    }

    try {
      await resetPasswordMutation.mutateAsync({
        userId: initialUser.id,
        newPassword: resetPassword,
      })
      alert.success('Berhasil', 'Password pengguna berhasil direset.')
      alert.info(
        'Password sementara',
        `Berikan password ini kepada pengguna (sekali tampil): ${resetPassword}`
      )
      setResetPassword(generateTempPassword())
    } catch (err) {
      alert.error('Gagal reset password', parseStaffUserMutationError(err))
    }
  }

  const submitting =
    createMutation.isPending || updateMutation.isPending || resetPasswordMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">
            {mode === 'create' ? 'Data pengguna baru' : 'Data pengguna'}
          </CardTitle>
          <CardDescription>
            {mode === 'create'
              ? 'Buat akun staf atau admin baru. Password sementara dibuat otomatis — salin dan berikan ke pengguna.'
              : 'Ubah data pengguna. Username tidak dapat diubah dari halaman ini.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="su-username">Username</Label>
            <Input
              id="su-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              forceUppercase={false}
              disabled={submitting || mode === 'edit'}
              autoComplete="username"
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="su-full-name">Nama lengkap</Label>
            <Input
              id="su-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              autoComplete="name"
              className="border-outline-variant"
            />
          </div>
          {mode === 'create' ? (
            <div className="grid gap-2">
              <Label htmlFor="su-temp-password">Password sementara</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="su-temp-password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  forceUppercase={false}
                  disabled={submitting}
                  autoComplete="new-password"
                  className="border-outline-variant min-w-[12rem] flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setTempPassword(generateTempPassword())}
                >
                  Buat ulang
                </Button>
              </div>
              <p className="text-on-surface-variant text-xs">
                Password tidak boleh sama dengan username. Pengguna harus mengganti setelah login pertama.
              </p>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="su-phone">Nomor telepon</Label>
            <RegionalPhoneInput
              id="su-phone"
              value={phone}
              onChange={setPhone}
              disabled={submitting}
            />
          </div>
          <div className="grid gap-2">
            <Label>Peran</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as UserRole)}
              disabled={submitting}
            >
              <SelectTrigger className="border-outline-variant w-full">
                <SelectValue placeholder="Peran" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {USER_ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="su-joined-date">Tanggal masuk kerja</Label>
            <DatePickerInput
              id="su-joined-date"
              value={joinedDate}
              onChange={setJoinedDate}
              disabled={submitting}
              ariaLabel="Tanggal masuk kerja"
            />
          </div>
        </CardContent>
      </Card>

      {mode === 'edit' && actorRole === 'ADMIN' ? (
        <Card className="border-outline-variant bg-card">
          <CardHeader className="border-outline-variant border-b pb-4">
            <CardTitle className="text-base">Reset password</CardTitle>
            <CardDescription>
              Buat password sementara baru untuk pengguna ini, lalu berikan ke pengguna.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-2">
              <Label htmlFor="su-reset-password">Password sementara baru</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="su-reset-password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  forceUppercase={false}
                  disabled={submitting}
                  autoComplete="new-password"
                  className="border-outline-variant min-w-[12rem] flex-1 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setResetPassword(generateTempPassword())}
                >
                  Buat ulang
                </Button>
              </div>
              <p className="text-on-surface-variant text-xs">
                Hanya admin yang dapat reset password pengguna dari halaman ini.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => void handleResetPassword()}
              >
                {resetPasswordMutation.isPending ? 'Mereset…' : 'Reset password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Batal
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
