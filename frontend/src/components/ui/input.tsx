import * as React from 'react'

import { cn } from '@/lib/utils'

type InputProps = React.ComponentProps<'input'> & {
  forceUppercase?: boolean
}

function Input({ className, type, forceUppercase = true, onInput, ...props }: InputProps) {
  const shouldUppercase = forceUppercase && type !== 'password'

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'border-input bg-background placeholder:text-muted-foreground h-11 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-[color,box-shadow] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]',
        shouldUppercase && 'uppercase',
        className
      )}
      onInput={(e) => {
        if (shouldUppercase) {
          const el = e.currentTarget
          const upper = el.value.toUpperCase()
          if (el.value !== upper) {
            const start = el.selectionStart
            const end = el.selectionEnd
            el.value = upper
            if (start != null && end != null) {
              el.setSelectionRange(start, end)
            }
          }
        }
        onInput?.(e)
      }}
      {...props}
    />
  )
}

export { Input }
