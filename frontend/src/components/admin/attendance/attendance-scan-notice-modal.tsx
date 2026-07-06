import { useEffect } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { USER_ROLE_LABEL } from '@/constants/user-roles'
import { cn } from '@/lib/utils'
import type { AttendancePreviewResponse } from '@/types/attendance'

export type AttendanceScanNoticeVariant = 'success' | 'warning' | 'error'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  preview?: AttendancePreviewResponse | null
  variant?: AttendanceScanNoticeVariant
  autoDismissMs?: number
}

function fmtDt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

const TITLE_CLASS: Record<AttendanceScanNoticeVariant, string> = {
  success: 'text-primary',
  warning: 'text-amber-600 dark:text-amber-400',
  error: 'text-destructive',
}

export function AttendanceScanNoticeModal({
  open,
  onOpenChange,
  title,
  message,
  preview = null,
  variant = 'warning',
  autoDismissMs = 3000,
}: Props) {
  const roleLabel =
    preview?.role != null
      ? USER_ROLE_LABEL[preview.role as keyof typeof USER_ROLE_LABEL] ?? preview.role
      : null

  useEffect(() => {
    if (!open || autoDismissMs <= 0) return
    const timer = window.setTimeout(() => onOpenChange(false), autoDismissMs)
    return () => window.clearTimeout(timer)
  }, [autoDismissMs, onOpenChange, open, title])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-outline-variant bg-card sm:max-w-md"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className={cn(TITLE_CLASS[variant])}>{title}</DialogTitle>
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
            {preview.is_late ? (
              <p className="text-destructive pt-1 text-xs font-medium">
                Terlambat
                {preview.minutes_late != null ? ` (+${preview.minutes_late} menit)` : ''}
              </p>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
