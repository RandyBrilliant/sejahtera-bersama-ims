import { useState } from 'react'

import {
  useActivateSystemUserMutation,
  useDeactivateSystemUserMutation,
} from '@/hooks/use-system-users-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SystemUser } from '@/types/system-user'

type Intent = 'activate' | 'deactivate'

type StaffUserStatusModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: SystemUser | null
  intent: Intent | null
}

export function StaffUserStatusModal({
  open,
  onOpenChange,
  user,
  intent,
}: StaffUserStatusModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const deactivateMutation = useDeactivateSystemUserMutation()
  const activateMutation = useActivateSystemUserMutation()

  function handleOpenChange(next: boolean) {
    if (!next) setErrorMessage(null)
    onOpenChange(next)
  }

  async function handleConfirm() {
    if (!user || !intent) return
    setErrorMessage(null)

    try {
      if (intent === 'deactivate') {
        await deactivateMutation.mutateAsync(user.id)
      } else {
        await activateMutation.mutateAsync(user.id)
      }
      handleOpenChange(false)
    } catch {
      setErrorMessage(
        intent === 'deactivate'
          ? 'Tidak dapat menonaktifkan pengguna. Coba lagi.'
          : 'Tidak dapat mengaktifkan pengguna. Coba lagi.'
      )
    }
  }

  const pending = deactivateMutation.isPending || activateMutation.isPending
  const title =
    intent === 'deactivate' ? 'Nonaktifkan pengguna?' : 'Aktifkan pengguna kembali?'
  const description =
    intent === 'deactivate'
      ? `Akun ${user?.username ?? ''} akan dinonaktifkan dan tidak dapat masuk sampai diaktifkan lagi.`
      : `Akun ${user?.username ?? ''} akan dapat masuk kembali.`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-outline-variant bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {errorMessage ? (
          <p className="text-destructive text-sm">{errorMessage}</p>
        ) : null}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="default"
            className={
              intent === 'deactivate'
                ? 'bg-destructive text-white hover:bg-destructive/90'
                : ''
            }
            onClick={() => void handleConfirm()}
            disabled={pending || !user || !intent}
          >
            {pending ? 'Memproses…' : intent === 'deactivate' ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
