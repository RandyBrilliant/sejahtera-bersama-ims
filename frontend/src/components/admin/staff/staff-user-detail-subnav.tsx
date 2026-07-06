import { cn } from '@/lib/utils'

export type StaffDetailTab = 'profile' | 'compensation' | 'card'

const tabs: { id: StaffDetailTab; label: string }[] = [
  { id: 'profile', label: 'Edit profil' },
  { id: 'compensation', label: 'Gaji pokok' },
  { id: 'card', label: 'Cetak kartu staf' },
]

type Props = {
  active: StaffDetailTab
  onChange: (tab: StaffDetailTab) => void
}

export function StaffUserDetailSubnav({ active, onChange }: Props) {
  return (
    <nav
      className="border-outline-variant bg-surface-container-lowest flex flex-wrap gap-1 rounded-xl border p-1"
      aria-label="Bagian detail staf"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-lg px-3 py-2 text-xs font-semibold tracking-wide uppercase transition-colors',
            active === tab.id
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
