import { useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type LogoutConfirmModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogoutConfirmModal({ open, onOpenChange }: LogoutConfirmModalProps) {
  const { logout } = useAuth()
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await logout()
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <DialogContent className="border-outline-variant bg-card sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Keluar dari aplikasi?</DialogTitle>
          <DialogDescription>
            Sesi Anda akan diakhiri. Untuk melanjutkan nanti, masuk kembali dengan username dan
            password.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="default"
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => void handleConfirm()}
            disabled={pending}
          >
            {pending ? 'Mengeluarkan…' : 'Keluar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
