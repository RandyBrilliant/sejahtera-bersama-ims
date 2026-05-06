import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col gap-3',
        month: 'space-y-3',
        caption: 'relative flex items-center justify-center pt-1',
        caption_label: 'text-sm font-medium',
        nav: 'absolute inset-x-0 top-1 flex items-center justify-between px-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'size-7 bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'size-7 bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground rounded-md w-9 text-[0.8rem] font-normal',
        weeks: 'mt-2 flex flex-col gap-1',
        week: 'flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'size-9 p-0 font-normal'
        ),
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md',
        today: 'bg-accent text-accent-foreground rounded-md',
        range_start: 'bg-primary text-primary-foreground rounded-s-md',
        range_middle: 'bg-accent text-accent-foreground rounded-none',
        range_end: 'bg-primary text-primary-foreground rounded-e-md',
        outside: 'text-muted-foreground opacity-50 aria-selected:bg-accent/50',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
