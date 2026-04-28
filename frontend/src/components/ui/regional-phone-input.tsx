import { cn } from '@/lib/utils'
import {
  joinRegionalPhone,
  REGIONAL_PHONE_OPTIONS,
  splitStoredPhone,
} from '@/lib/regional-phone'

type RegionalPhoneInputProps = {
  id?: string
  value: string
  onChange: (nextFull: string) => void
  disabled?: boolean
  error?: string
  className?: string
}

export function RegionalPhoneInput({
  id,
  value,
  onChange,
  disabled,
  error,
  className,
}: RegionalPhoneInputProps) {
  const { dial, nationalDigits } = splitStoredPhone(value)

  function handleDialChange(nextDial: string) {
    onChange(joinRegionalPhone(nextDial, nationalDigits))
  }

  function handleNationalChange(raw: string) {
    const digits = raw.replace(/\D/g, '')
    onChange(joinRegionalPhone(dial, digits))
  }

  const selectedFlag =
    REGIONAL_PHONE_OPTIONS.find((r) => r.dial === dial)?.flag ?? REGIONAL_PHONE_OPTIONS[0].flag

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={id ? `${id}-country` : undefined}>
          Negara / kode
        </label>
        <div className="border-outline-variant bg-background shrink-0 rounded-md border">
          <select
            id={id ? `${id}-country` : undefined}
            className="focus-visible:ring-ring h-9 max-w-[min(13rem,44vw)] cursor-pointer rounded-md bg-transparent py-2 pr-8 pl-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={dial}
            onChange={(e) => handleDialChange(e.target.value)}
            disabled={disabled}
            aria-label="Negara dan kode telepon"
          >
            {REGIONAL_PHONE_OPTIONS.map((r) => (
              <option key={r.iso} value={r.dial}>
                {r.flag} {r.dial} — {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="border-outline-variant relative flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-transparent px-3 shadow-xs">
          <span className="text-muted-foreground shrink-0 text-lg leading-none select-none">
            {selectedFlag}
          </span>
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="8123456789"
            className="placeholder:text-muted-foreground h-9 w-full min-w-0 border-0 bg-transparent py-1 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            value={nationalDigits}
            onChange={(e) => handleNationalChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      {nationalDigits ? (
        <p className="text-muted-foreground text-xs">
          Disimpan: <span className="font-mono">{joinRegionalPhone(dial, nationalDigits)}</span>
        </p>
      ) : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  )
}
