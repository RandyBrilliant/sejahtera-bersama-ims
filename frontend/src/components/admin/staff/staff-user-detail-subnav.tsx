import { pillSubnavItemClass, pillSubnavNavClass } from '@/lib/pill-subnav'

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
      className={pillSubnavNavClass}
      aria-label="Bagian detail staf"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={pillSubnavItemClass(active === tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
