/** Negara tetap untuk IMS (bukan picker global). Prefix dial unik per opsi. */
export const REGIONAL_PHONE_OPTIONS = [
  { iso: 'ID', dial: '+62', flag: '🇮🇩', label: 'Indonesia' },
  { iso: 'MY', dial: '+60', flag: '🇲🇾', label: 'Malaysia' },
  { iso: 'SG', dial: '+65', flag: '🇸🇬', label: 'Singapura' },
  { iso: 'PH', dial: '+63', flag: '🇵🇭', label: 'Filipina' },
  { iso: 'TH', dial: '+66', flag: '🇹🇭', label: 'Thailand' },
] as const

const DEFAULT_DIAL = REGIONAL_PHONE_OPTIONS[0].dial

const BY_DIAL_DESC = [...REGIONAL_PHONE_OPTIONS].sort(
  (a, b) => b.dial.length - a.dial.length
)

export function splitStoredPhone(stored: string): { dial: string; nationalDigits: string } {
  const clean = stored.replace(/[\s-]/g, '').trim()
  if (!clean) return { dial: DEFAULT_DIAL, nationalDigits: '' }

  let s = clean
  if (s.startsWith('00')) s = `+${s.slice(2)}`

  if (s.startsWith('+')) {
    for (const r of BY_DIAL_DESC) {
      if (s.startsWith(r.dial)) {
        return {
          dial: r.dial,
          nationalDigits: s.slice(r.dial.length).replace(/\D/g, ''),
        }
      }
    }
    const digits = s.slice(1).replace(/\D/g, '')
    return { dial: DEFAULT_DIAL, nationalDigits: digits }
  }

  for (const r of BY_DIAL_DESC) {
    const code = r.dial.slice(1)
    if (s.startsWith(code)) {
      return {
        dial: r.dial,
        nationalDigits: s.slice(code.length).replace(/\D/g, ''),
      }
    }
  }

  if (s.startsWith('0')) {
    return { dial: DEFAULT_DIAL, nationalDigits: s.slice(1).replace(/\D/g, '') }
  }

  return { dial: DEFAULT_DIAL, nationalDigits: s.replace(/\D/g, '') }
}

/** Gabung untuk disimpan di `phone_number` (mis. `+628123456789`). */
export function joinRegionalPhone(dial: string, nationalDigits: string): string {
  const digits = nationalDigits.replace(/\D/g, '')
  if (!digits) return ''
  const prefix = REGIONAL_PHONE_OPTIONS.find((r) => r.dial === dial)?.dial ?? dial
  return `${prefix}${digits}`
}

export function formatRegionalPhonePreview(stored: string): string {
  const { dial, nationalDigits } = splitStoredPhone(stored)
  if (!nationalDigits) return '—'
  const flag =
    REGIONAL_PHONE_OPTIONS.find((r) => r.dial === dial)?.flag ?? ''
  const spaced = nationalDigits.replace(/(\d{4})(?=\d)/g, '$1 ')
  return `${flag} ${dial} ${spaced}`.trim()
}
