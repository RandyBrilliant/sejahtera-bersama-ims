import { useEffect, useState } from 'react'

import { parseStaffUserMutationError } from '@/components/admin/staff/staff-user-mutation-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetSystemUserPasswordMutation } from '@/hooks/use-system-users-query'
import { alert } from '@/lib/alert'
import type { SystemUser } from '@/types/system-user'

type StaffUserResetPasswordModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SystemUser | null
}

export function StaffUserResetPasswordModal({
  open,
  onOpenChange,
  user,
}: StaffUserResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resetPasswordMutation = useResetSystemUserPasswordMutation()

  useEffect(() => {
    if (!open) {
      setNewPassword('')
      setConfirmPassword('')
      setErrorMessage(null)
    }
  }, [open])

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
  }

  async function handleConfirm() {
    if (!user) return
    setErrorMessage(null)

    const nextPassword = newPassword.trim()
    if (!nextPassword) {
      setErrorMessage('Password baru wajib diisi.')
      return
    }
    if (nextPassword.length < 8) {
      setErrorMessage('Password minimal 8 karakter.')
      return
    }
    if (nextPassword === user.username) {
      setErrorMessage('Password tidak boleh sama dengan username.')
      return
    }
    if (nextPassword !== confirmPassword.trim()) {
      setErrorMessage('Konfirmasi password tidak sama.')
      return
    }

    try {
      await resetPasswordMutation.mutateAsync({
        userId: user.id,
        newPassword: nextPassword,
      })
      alert.success(
        'Password direset',
        `Password baru untuk ${user.full_name || user.username} sudah disimpan. Berikan kepada pengguna.`
      )
      handleOpenChange(false)
    } catch (err) {
      setErrorMessage(parseStaffUserMutationError(err))
    }
  }

  const pending = resetPasswordMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-outline-variant bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Isi password baru untuk {user?.full_name || user?.username || 'pengguna ini'}.
            Password tidak dibuat otomatis.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void handleConfirm()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="staff-reset-password">
              Password baru <span className="text-destructive">*</span>
            </Label>
            <Input
              id="staff-reset-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              forceUppercase={false}
              disabled={pending}
              autoComplete="new-password"
              className="border-outline-variant"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="staff-reset-password-confirm">
              Konfirmasi password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="staff-reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              forceUppercase={false}
              disabled={pending}
              autoComplete="new-password"
              className="border-outline-variant"
            />
          </div>
          <p className="text-on-surface-variant text-xs">
            Minimal 8 karakter, bukan password umum, dan tidak sama dengan username.
          </p>
          {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
          <DialogFooter className="gap-2 px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending || !user}>
              {pending ? 'Menyimpan…' : 'Simpan password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
