import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

type SearchableParams = { page?: number; search?: string }

/**
 * Search-as-you-type for paginated list params: once typing pauses for `delayMs`,
 * writes the trimmed term into `params.search` and resets to page 1.
 */
export function useDebouncedSearch<P extends SearchableParams>(
  setParams: Dispatch<SetStateAction<P>>,
  delayMs = 300
) {
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const term = searchInput.trim() || undefined
    const timer = setTimeout(() => {
      setParams((p) => (p.search === term ? p : { ...p, page: 1, search: term }))
    }, delayMs)
    return () => clearTimeout(timer)
  }, [searchInput, delayMs, setParams])

  return [searchInput, setSearchInput] as const
}
