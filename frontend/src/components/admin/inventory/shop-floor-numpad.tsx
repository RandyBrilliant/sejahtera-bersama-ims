import { useEffect, useState } from 'react'
import { Delete } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/** Convert Indonesian display qty (`12,5`) to API/dot format (`12.5`). */
export function qtyDisplayToApi(display: string): string {
  const cleaned = display.trim().replace(/\s/g, '')
  if (!cleaned) return ''
  return cleaned.replace(/\./g, '').replace(',', '.')
}

/** Convert API/dot format to Indonesian display. */
export function qtyApiToDisplay(api: string | number): string {
  const raw = String(api ?? '').trim()
  if (!raw) return ''
  return raw.replace('.', ',')
}

function parseDisplayNumber(display: string): number {
  const api = qtyDisplayToApi(display)
  const n = Number(api)
  return Number.isFinite(n) ? n : 0
}

type ShopFloorNumpadProps = {
  value: string
  onChange: (next: string) => void
  className?: string
  /** Quick-add chips above the pad. */
  showQuickAdd?: boolean
}

/**
 * Large on-screen numpad for shop-floor quantity entry.
 * Uses Indonesian decimal comma (`,`).
 */
export function ShopFloorNumpad({
  value,
  onChange,
  className,
  showQuickAdd = true,
}: ShopFloorNumpadProps) {
  function pressDigit(digit: string) {
    if (value === '0' && digit !== ',') {
      onChange(digit)
      return
    }
    onChange(value + digit)
  }

  function pressComma() {
    if (!value) {
      onChange('0,')
      return
    }
    if (value.includes(',')) return
    onChange(value + ',')
  }

  function pressBackspace() {
    onChange(value.slice(0, -1))
  }

  function pressClear() {
    onChange('')
  }

  function addQuick(amount: number) {
    const next = parseDisplayNumber(value) + amount
    onChange(qtyApiToDisplay(String(next)))
  }

  const keys: { label: string; action: () => void; wide?: boolean; muted?: boolean }[] = [
    { label: '1', action: () => pressDigit('1') },
    { label: '2', action: () => pressDigit('2') },
    { label: '3', action: () => pressDigit('3') },
    { label: '4', action: () => pressDigit('4') },
    { label: '5', action: () => pressDigit('5') },
    { label: '6', action: () => pressDigit('6') },
    { label: '7', action: () => pressDigit('7') },
    { label: '8', action: () => pressDigit('8') },
    { label: '9', action: () => pressDigit('9') },
    { label: ',', action: pressComma, muted: true },
    { label: '0', action: () => pressDigit('0') },
    { label: '⌫', action: pressBackspace, muted: true },
  ]

  return (
    <div className={cn('space-y-3', className)}>
      {showQuickAdd ? (
        <div className="flex flex-wrap gap-2">
          {[1, 5, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => addQuick(n)}
              className={cn(
                'border-outline-variant bg-surface-container-low text-on-surface',
                'min-h-12 min-w-[4.5rem] flex-1 rounded-xl border px-3 text-base font-semibold',
                'active:bg-surface-container-high transition-colors'
              )}
            >
              +{n}
            </button>
          ))}
          <button
            type="button"
            onClick={pressClear}
            className={cn(
              'border-outline-variant text-on-surface-variant',
              'min-h-12 min-w-[4.5rem] flex-1 rounded-xl border px-3 text-base font-semibold',
              'active:bg-surface-container-low transition-colors'
            )}
          >
            Hapus
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key.label}
            type="button"
            onClick={key.action}
            className={cn(
              'min-h-16 rounded-xl text-2xl font-semibold tabular-nums transition-colors',
              'active:scale-[0.98] focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
              key.muted
                ? 'border-outline-variant bg-surface-container-low text-on-surface-variant border'
                : 'bg-primary text-primary-foreground hover:opacity-95'
            )}
            aria-label={key.label === '⌫' ? 'Hapus angka' : key.label}
          >
            {key.label === '⌫' ? <Delete className="mx-auto size-6" /> : key.label}
          </button>
        ))}
      </div>
    </div>
  )
}

type ShopFloorQuantityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  unitLabel?: string
  /** Initial value in API/dot format. */
  initialValue?: string
  /** Allow confirming zero. Default false. */
  allowZero?: boolean
  /** Secondary action (e.g. skip bonus). */
  secondaryLabel?: string
  onSecondary?: () => void
  confirmLabel?: string
  onConfirm: (apiValue: string) => void
}

export function ShopFloorQuantityDialog({
  open,
  onOpenChange,
  title,
  description,
  unitLabel,
  initialValue = '',
  allowZero = false,
  secondaryLabel,
  onSecondary,
  confirmLabel = 'OK',
  onConfirm,
}: ShopFloorQuantityDialogProps) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (open) {
      setDisplay(qtyApiToDisplay(initialValue))
    }
  }, [open, initialValue, title])

  function handleConfirm() {
    const api = qtyDisplayToApi(display)
    const n = Number(api)
    if (!api || !Number.isFinite(n) || (!allowZero && n <= 0)) {
      return
    }
    // Parent controls open state (may advance to another qty step without closing).
    onConfirm(api)
  }

  const api = qtyDisplayToApi(display)
  const n = Number(api)
  const canConfirm = Boolean(api) && Number.isFinite(n) && (allowZero ? n >= 0 : n > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="border-outline-variant bg-card max-h-[min(92vh,720px)] w-full max-w-md overflow-y-auto sm:max-w-md"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="font-heading text-xl">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-base">{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div
          className={cn(
            'border-outline-variant bg-surface-container-lowest rounded-2xl border px-4 py-5 text-center'
          )}
        >
          <p className="text-on-surface font-heading text-4xl font-semibold tabular-nums tracking-tight md:text-5xl">
            {display || '0'}
          </p>
          {unitLabel ? (
            <p className="text-on-surface-variant mt-1 text-sm font-medium">{unitLabel}</p>
          ) : null}
        </div>

        <ShopFloorNumpad value={display} onChange={setDisplay} />

        <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
          <Button
            type="button"
            size="lg"
            className="min-h-14 flex-1 text-base font-semibold"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
          {secondaryLabel && onSecondary ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="min-h-14 flex-1 text-base font-semibold"
              onClick={() => {
                onSecondary()
              }}
            >
              {secondaryLabel}
            </Button>
          ) : (
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="min-h-14 flex-1 text-base font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
