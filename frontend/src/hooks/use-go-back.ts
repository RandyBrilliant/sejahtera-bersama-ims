import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

function canNavigateBack(): boolean {
  if (typeof window === 'undefined') return false
  const state = window.history.state as { idx?: number } | null
  return typeof state?.idx === 'number' && state.idx > 0
}

/** Navigate to the previous history entry (preserves query strings). Falls back when there is no in-app history. */
export function useGoBack() {
  const navigate = useNavigate()

  const goBack = useCallback(
    (fallback?: string) => {
      if (canNavigateBack()) {
        navigate(-1)
      } else if (fallback) {
        navigate(fallback)
      } else {
        navigate(-1)
      }
    },
    [navigate],
  )

  return goBack
}
