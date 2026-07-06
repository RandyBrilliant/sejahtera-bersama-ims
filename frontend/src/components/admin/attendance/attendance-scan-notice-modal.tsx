import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { USER_ROLE_LABEL } from '@/constants/user-roles'
import type { AttendancePreviewResponse } from '@/types/attendance'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  preview: AttendancePreviewResponse | null
}

function fmtDt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export function AttendanceScanNoticeModal({
  open,
  onOpenChange,
  title,
  message,
  preview,
}: Props) {
  const roleLabel =
    preview?.role != null
      ? USER_ROLE_LABEL[preview.role as keyof typeof USER_ROLE_LABEL] ?? preview.role
      : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-outline-variant bg-card sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-on-surface-variant leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <div className="border-outline-variant space-y-1 rounded-lg border px-3 py-3 text-sm">
            <p className="text-on-surface font-semibold">{preview.full_name}</p>
            {roleLabel ? <p className="text-on-surface-variant">{roleLabel}</p> : null}
            {preview.checked_in_at ? (
              <p className="text-on-surface-variant pt-1">
                Waktu masuk:{' '}
                <span className="text-on-surface font-medium tabular-nums">
                  {fmtDt(preview.checked_in_at)}
                </span>
              </p>
            ) : null}
            {preview.checked_out_at ? (
              <p className="text-on-surface-variant">
                Waktu pulang:{' '}
                <span className="text-on-surface font-medium tabular-nums">
                  {fmtDt(preview.checked_out_at)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
