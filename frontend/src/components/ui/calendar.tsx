import * as React from 'react'
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import { id } from 'react-day-picker/locale'

import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown',
  navLayout = 'around',
  startMonth,
  endMonth,
  locale = id,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const currentYear = new Date().getFullYear()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      navLayout={navLayout}
      locale={locale}
      startMonth={startMonth ?? new Date(currentYear - 50, 0)}
      endMonth={endMonth ?? new Date(currentYear + 10, 11)}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'flex flex-col gap-3',
        month: 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1.5 gap-y-3',
        month_caption: 'col-start-2 row-start-1 flex min-w-0 items-center justify-center',
        caption_label:
          'flex h-8 items-center gap-1 px-2 text-sm font-medium whitespace-nowrap select-none [&>svg]:size-3.5 [&>svg]:opacity-50',
        nav: 'hidden',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'col-start-1 row-start-1 size-8 shrink-0 bg-transparent p-0 opacity-80 hover:opacity-100'
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'col-start-3 row-start-1 size-8 shrink-0 bg-transparent p-0 opacity-80 hover:opacity-100'
        ),
        dropdowns: 'flex w-full min-w-0 items-center justify-center gap-1.5',
        dropdown_root:
          'border-input bg-field relative inline-flex h-8 max-w-full items-center rounded-md border shadow-xs has-focus:border-ring has-focus:ring-ring/30 has-focus:ring-[3px]',
        dropdown: 'absolute inset-0 z-10 cursor-pointer opacity-0',
        months_dropdown: 'relative min-w-0',
        years_dropdown: 'relative min-w-0',
        month_grid: 'col-span-3 row-start-2 w-full border-collapse',
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
