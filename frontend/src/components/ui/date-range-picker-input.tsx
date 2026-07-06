import { CalendarDays } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type DateRangeValue = {
  start: string
  end: string
}

type DateRangePickerInputProps = {
  id?: string
  startDate: string
  endDate: string
  onChange: (value: DateRangeValue) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  minDate?: string
  maxDate?: string
  ariaLabel?: string
}

function parseIsoDateOnly(iso: string): Date | undefined {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return undefined
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toIsoDateOnly(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toDateRange(start: string, end: string): DateRange | undefined {
  const from = start ? parseIsoDateOnly(start) : undefined
  const to = end ? parseIsoDateOnly(end) : undefined
  if (!from && !to) return undefined
  return { from, to }
}

function formatDisplayDate(iso: string): string {
  const date = parseIsoDateOnly(iso)
  return date ? format(date, 'dd/MM/yyyy') : iso
}

function buildDisplayText(start: string, end: string, placeholder: string): string {
  if (start && end) return `${formatDisplayDate(start)} — ${formatDisplayDate(end)}`
  if (start) return `${formatDisplayDate(start)} — …`
  if (end) return `… — ${formatDisplayDate(end)}`
  return placeholder
}

function draftToValue(draft: DateRange | undefined): DateRangeValue | null {
  if (!draft?.from) return null
  const start = toIsoDateOnly(draft.from)
  const end = toIsoDateOnly(draft.to ?? draft.from)
  return start <= end ? { start, end } : { start: end, end: start }
}

export function DateRangePickerInput({
  id,
  startDate,
  endDate,
  onChange,
  disabled,
  className,
  placeholder = 'Pilih rentang tanggal…',
  minDate,
  maxDate,
  ariaLabel,
}: DateRangePickerInputProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>()
  const [month, setMonth] = useState<Date>(() => new Date())

  const committed = useMemo(
    () => toDateRange(startDate, endDate),
    [endDate, startDate]
  )

  const min = useMemo(() => (minDate ? parseIsoDateOnly(minDate) : undefined), [minDate])
  const max = useMemo(() => (maxDate ? parseIsoDateOnly(maxDate) : undefined), [maxDate])

  const displayText = buildDisplayText(startDate, endDate, placeholder)
  const draftPreview = draftToValue(draft)

  const commitDraft = useCallback(
    (nextDraft: DateRange | undefined) => {
      const value = draftToValue(nextDraft)
      if (!value) return false
      onChange(value)
      return true
    },
    [onChange]
  )

  useEffect(() => {
    if (!open) return
    setDraft(committed)
    setMonth(committed?.to ?? committed?.from ?? new Date())
  }, [open, committed])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
  }

  function handleSelect(next: DateRange | undefined) {
    if (!next?.from) return
    setDraft(next)
  }

  function handleApply() {
    if (commitDraft(draft)) {
      setOpen(false)
    }
  }

  function applyPreset(daysBack: number) {
    const end = new Date()
    const start = subDays(end, daysBack - 1)
    onChange({
      start: toIsoDateOnly(start),
      end: toIsoDateOnly(end),
    })
    setOpen(false)
  }

  function handleClear() {
    onChange({ start: '', end: '' })
    setDraft(undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel ?? 'Pilih rentang tanggal'}
          className={cn(
            'border-outline-variant w-full justify-between font-normal',
            !startDate && !endDate && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{displayText}</span>
          <CalendarDays className="text-on-surface-variant size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-outline-variant space-y-2 border-b p-3">
          <p className="text-on-surface-variant text-xs leading-relaxed">
            Klik tanggal mulai, lalu tanggal selesai. Satu hari: pilih tanggal yang sama dua kali.
          </p>
          {draftPreview ? (
            <p className="text-sm font-medium">
              {formatDisplayDate(draftPreview.start)} — {formatDisplayDate(draftPreview.end)}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Belum ada rentang dipilih</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(7)}>
              7 hari
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => applyPreset(30)}>
              30 hari
            </Button>
            {(startDate || endDate) && (
              <Button type="button" variant="outline" size="sm" onClick={handleClear}>
                Hapus
              </Button>
            )}
            <Button type="button" size="sm" disabled={!draft?.from} onClick={handleApply}>
              Terapkan
            </Button>
          </div>
        </div>
        <Calendar
          mode="range"
          month={month}
          onMonthChange={setMonth}
          selected={draft}
          onSelect={handleSelect}
          disabled={[
            ...(min ? [{ before: min }] : []),
            ...(max ? [{ after: max }] : []),
          ]}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  )
}
