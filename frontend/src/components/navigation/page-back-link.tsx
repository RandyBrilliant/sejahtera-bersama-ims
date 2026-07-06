import type { ReactNode } from 'react'

import { useGoBack } from '@/hooks/use-go-back'
import { cn } from '@/lib/utils'

const linkClassName =
  'text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium'

const inlineClassName = 'text-primary font-medium underline underline-offset-2'

type PageBackLinkProps = {
  fallback?: string
  children?: ReactNode
  className?: string
  variant?: 'link' | 'inline'
}

export function PageBackLink({
  fallback,
  children = '← Kembali',
  className,
  variant = 'link',
}: PageBackLinkProps) {
  const goBack = useGoBack()

  return (
    <button
      type="button"
      onClick={() => goBack(fallback)}
      className={cn(variant === 'inline' ? inlineClassName : linkClassName, className)}
    >
      {children}
    </button>
  )
}
