import { CalendarDays } from 'lucide-react'
import { useMemo } from 'react'
import { addDays, format, parseISO } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type DatePickerInputProps = {
  id?: string
  value: string
  onChange: (nextIso: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  minDate?: string
  maxDate?: string
  ariaLabel?: string
}

export function DatePickerInput({
  id,
  value,
  onChange,
  disabled,
  className,
  placeholder,
  minDate,
  maxDate,
  ariaLabel,
}: DatePickerInputProps) {
  const selected = useMemo(() => {
    if (!value) return undefined
    try {
      return parseISO(value)
    } catch {
      return undefined
    }
  }, [value])
  const min = useMemo(() => (minDate ? parseISO(minDate) : undefined), [minDate])
  const max = useMemo(() => (maxDate ? parseISO(maxDate) : undefined), [maxDate])
  const displayText = value && selected ? format(selected, 'dd/MM/yyyy') : (placeholder ?? 'Pilih tanggal…')

  function pick(d: Date) {
    onChange(format(d, 'yyyy-MM-dd'))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'border-outline-variant w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">{displayText}</span>
          <CalendarDays className="text-on-surface-variant size-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="border-outline-variant flex flex-wrap gap-2 border-b px-3 py-2">
          <Button type="button" variant="outline" size="sm" onClick={() => pick(new Date())}>
            Hari ini
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => pick(addDays(new Date(), 1))}>
            H+1
          </Button>
        </div>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => d && pick(d)}
          disabled={[
            ...(min ? [{ before: min }] : []),
            ...(max ? [{ after: max }] : []),
          ]}
        />
      </PopoverContent>
    </Popover>
  )
}
