/** "Randy Brilliant" → "RB"; falls back to the first two letters of the username. */
export function initialsFromUser(fullName: string | undefined, username: string): string {
  const n = fullName?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    const s =
      parts.length >= 2
        ? `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`
        : parts[0]!.slice(0, 2)
    return s.toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}
