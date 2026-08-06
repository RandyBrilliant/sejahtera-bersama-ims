import * as React from 'react'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown',
  startMonth,
  endMonth,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const currentYear = new Date().getFullYear()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth ?? new Date(currentYear - 50, 0)}
      endMonth={endMonth ?? new Date(currentYear + 10, 11)}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'relative flex flex-col gap-3',
        month: 'flex w-full flex-col gap-3',
        month_caption: 'relative flex h-9 w-full items-center justify-center px-9',
        caption_label:
          'flex h-9 items-center gap-1 px-2 text-sm font-medium whitespace-nowrap select-none [&>svg]:size-3.5 [&>svg]:opacity-50',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'size-7 z-10 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'size-7 z-10 shrink-0 bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        dropdowns: 'flex h-9 w-full items-center justify-center gap-1.5',
        dropdown_root:
          'border-input bg-field relative rounded-md border shadow-xs has-focus:border-ring has-focus:ring-ring/30 has-focus:ring-[3px]',
        dropdown: 'absolute inset-0 z-10 cursor-pointer opacity-0',
        months_dropdown: 'relative',
        years_dropdown: 'relative',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground w-9 rounded-md text-[0.8rem] font-normal',
        weeks: 'mt-1 flex flex-col gap-1',
        week: 'flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'size-9 p-0 font-normal aria-selected:opacity-100'
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
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          if (orientation === 'left') {
            return <ChevronLeftIcon className={cn('size-4', chevronClassName)} {...chevronProps} />
          }
          if (orientation === 'right') {
            return <ChevronRightIcon className={cn('size-4', chevronClassName)} {...chevronProps} />
          }
          return (
            <ChevronDownIcon className={cn('size-3.5 opacity-50', chevronClassName)} {...chevronProps} />
          )
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
