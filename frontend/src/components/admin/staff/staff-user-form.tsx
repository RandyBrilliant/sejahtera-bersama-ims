import { useState } from 'react'

import {
  manageableRolesForActor,
  USER_ROLE_LABEL,
} from '@/constants/user-roles'
import {
  useCreateSystemUserMutation,
  useUpdateSystemUserMutation,
} from '@/hooks/use-system-users-query'
import { alert } from '@/lib/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  const [password, setPassword] = useState('')

  const createMutation = useCreateSystemUserMutation()
  const updateMutation = useUpdateSystemUserMutation(initialUser?.id ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'create') {
      if (!username.trim()) {
        alert.error('Validasi', 'Username wajib diisi.')
        return
      }
      if (!password.trim()) {
        alert.error('Validasi', 'Password wajib diisi untuk pengguna baru.')
        return
      }
      if (!fullName.trim()) {
        alert.error('Validasi', 'Nama lengkap wajib diisi.')
        return
      }

      try {
        await createMutation.mutateAsync({
          username: username.trim(),
          password,
          full_name: fullName.trim(),
          role,
          phone_number: phone.trim() || undefined,
        })
        alert.success('Berhasil', 'Pengguna berhasil dibuat.')
        onSaved()
      } catch (err) {
        alert.error('Gagal menyimpan', parseStaffUserMutationError(err))
      }
      return
    }

    if (!initialUser) return

    try {
      const patch: {
        full_name?: string
        role?: UserRole
        phone_number?: string
        password?: string
      } = {
        full_name: fullName.trim(),
        role,
        phone_number: phone.trim(),
      }
      if (password.trim()) {
        patch.password = password
      }
      await updateMutation.mutateAsync(patch)
      alert.success('Berhasil', 'Perubahan disimpan.')
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parseStaffUserMutationError(err))
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">
            {mode === 'create' ? 'Data pengguna baru' : 'Data pengguna'}
          </CardTitle>
          <CardDescription>
            {mode === 'create'
              ? 'Buat akun staf atau admin baru. Password wajib pada pembuatan.'
              : 'Ubah data pengguna. Kosongkan password jika tidak ingin mengubahnya.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-2">
            <Label htmlFor="su-username">Username</Label>
            <Input
              id="su-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
            <Label htmlFor="su-password">
              Password {mode === 'create' ? '' : '(opsional)'}
            </Label>
            <Input
              id="su-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              autoComplete="new-password"
              placeholder={mode === 'edit' ? 'Biarkan kosong untuk tidak mengubah' : ''}
              className="border-outline-variant"
            />
          </div>
        </CardContent>
      </Card>

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
