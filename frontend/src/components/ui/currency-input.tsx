import { Input } from '@/components/ui/input'

type CurrencyInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

function formatIdNumber(value: string): string {
  if (!value) return ''
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.trunc(n))
}

export function CurrencyInput({
  id,
  value,
  onChange,
  disabled,
  className,
  placeholder,
}: CurrencyInputProps) {
  const displayValue = formatIdNumber(value)

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={(e) => {
        const digitsOnly = e.target.value.replace(/\D/g, '')
        const normalized = digitsOnly.replace(/^0+(?=\d)/, '')
        onChange(normalized)
      }}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
      aria-label="Jumlah rupiah"
    />
  )
}
