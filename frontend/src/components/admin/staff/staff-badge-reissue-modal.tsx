import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffName: string
  pending?: boolean
  errorMessage?: string | null
  onConfirm: () => void
}

export function StaffBadgeReissueModal({
  open,
  onOpenChange,
  staffName,
  pending = false,
  errorMessage = null,
  onConfirm,
}: Props) {
  function handleOpenChange(next: boolean) {
    if (!pending) onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-outline-variant bg-card sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Terbitkan ulang kartu?</DialogTitle>
          <DialogDescription>
            Kartu presensi untuk <span className="text-on-surface font-semibold">{staffName}</span>{' '}
            akan dibuat ulang dengan token baru. QR pada kartu lama tidak lagi berlaku untuk presensi.
            Cetak kartu fisik baru setelah proses ini selesai.
          </DialogDescription>
        </DialogHeader>
        {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Batal
          </Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>
            {pending ? 'Memproses…' : 'Terbitkan ulang'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
