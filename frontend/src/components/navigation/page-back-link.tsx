import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

import { useGoBack } from '@/hooks/use-go-back'
import { cn } from '@/lib/utils'

const linkClassName =
  'text-on-surface-variant hover:text-primary mb-2 inline-flex items-center gap-2.5 py-1.5 text-base font-medium'

const inlineClassName =
  'text-primary inline-flex items-center gap-1.5 text-base font-medium underline underline-offset-2'

function stripArrowPrefix(label: ReactNode): ReactNode {
  if (typeof label === 'string' && label.startsWith('← ')) {
    return label.slice(2)
  }
  return label
}

type PageBackLinkProps = {
  fallback?: string
  children?: ReactNode
  className?: string
  variant?: 'link' | 'inline'
}

export function PageBackLink({
  fallback,
  children = 'Kembali',
  className,
  variant = 'link',
}: PageBackLinkProps) {
  const goBack = useGoBack()
  const label = stripArrowPrefix(children)
  const arrowClassName = variant === 'inline' ? 'size-4' : 'size-5'

  return (
    <button
      type="button"
      onClick={() => goBack(fallback)}
      className={cn(variant === 'inline' ? inlineClassName : linkClassName, className)}
    >
      <ArrowLeft className={cn(arrowClassName, 'shrink-0')} aria-hidden />
      {label}
    </button>
  )
}
