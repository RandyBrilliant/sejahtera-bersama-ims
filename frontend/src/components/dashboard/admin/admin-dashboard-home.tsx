import {
  Banknote,
  Download,
  Globe,
  Group,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const kpi = [
  {
    label: 'Total stok',
    value: '124.592',
    icon: Package,
    trend: { type: 'up' as const, text: '+2,4% minggu ini' },
  },
  {
    label: 'Pesanan aktif',
    value: '3.481',
    icon: ShoppingCart,
    trend: { type: 'down' as const, text: '-1,2% minggu ini' },
  },
  {
    label: 'Pendapatan mingguan',
    value: 'Rp 892,4 jt',
    icon: Banknote,
    trend: { type: 'up' as const, text: '+5,7% minggu ini' },
  },
  {
    label: 'Biaya operasi',
    value: 'Rp 142,1 jt',
    icon: Wallet,
    trend: { type: 'steady' as const, text: 'Stabil minggu ini' },
  },
]

const warehouseBars = [
  { label: 'GK1', pct: 40 },
  { label: 'GK2', pct: 60 },
  { label: 'GK3', pct: 85 },
  { label: 'GK4', pct: 50 },
  { label: 'GK5', pct: 70 },
  { label: 'GK6', pct: 30 },
]

const stockItems = [
  {
    name: 'Semikonduktor A-1',
    units: '12 unit tersisa',
    alert: true,
    action: 'Pesan lagi',
    actionPrimary: true,
  },
  {
    name: 'Sensor Optik V2',
    units: '4 unit tersisa',
    alert: true,
    action: 'Pesan lagi',
    actionPrimary: true,
  },
  {
    name: 'Casing Baja 4x4',
    units: '89 unit tersisa',
    alert: false,
    action: 'Tinjau',
    actionPrimary: false,
  },
]

export function AdminDashboardHome() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Dasbor
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            Ringkasan jaringan inventaris Anda
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low gap-2 rounded-lg text-[11px] font-semibold tracking-wider uppercase"
          >
            <Download className="size-4" />
            Ekspor
          </Button>
          <Button
            type="button"
            className="ambient-shadow bg-primary text-primary-foreground hover:opacity-90 gap-2 rounded-lg text-[11px] font-semibold tracking-wider uppercase"
          >
            <Plus className="size-4" />
            Entri baru
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {kpi.map((item) => (
          <div
            key={item.label}
            className="ambient-shadow border-outline-variant bg-surface-container-lowest flex flex-col justify-between rounded-xl border p-4"
          >
            <div className="flex items-start justify-between">
              <span className="text-on-surface-variant text-[11px] font-semibold tracking-wider uppercase">
                {item.label}
              </span>
              <span className="bg-surface-container-low text-primary rounded p-1">
                <item.icon className="size-5" />
              </span>
            </div>
            <div className="mt-4">
              <div className="text-on-surface font-heading text-2xl font-semibold tabular-nums tracking-tight">
                {item.value}
              </div>
              <div
                className={cn(
                  'mt-1 flex items-center gap-1 text-[13px] leading-[18px] font-medium tabular-nums',
                  item.trend.type === 'up' && 'text-trend-positive',
                  item.trend.type === 'down' && 'text-error-app',
                  item.trend.type === 'steady' && 'text-on-surface-variant'
                )}
              >
                {item.trend.type === 'up' && <TrendingUp className="size-4 shrink-0" />}
                {item.trend.type === 'down' && <TrendingDown className="size-4 shrink-0" />}
                {item.trend.type === 'steady' && <Minus className="size-4 shrink-0" />}
                {item.trend.text}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-6 lg:col-span-2 lg:space-y-8">
          <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
            <div className="border-outline-variant mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-on-surface font-heading text-lg font-semibold">
                Performa gudang
              </h2>
              <button
                type="button"
                className="text-on-surface-variant hover:text-primary transition-colors"
                aria-label="Menu lainnya"
              >
                <MoreHorizontal className="size-5" />
              </button>
            </div>
            <div className="flex h-64 items-end gap-2 px-2 pb-2">
              {warehouseBars.map((bar) => (
                <div key={bar.label} className="flex h-full min-h-0 flex-1 flex-col justify-end">
                  <div
                    className={cn(
                      'w-full min-h-[6px] rounded-t-sm transition-opacity',
                      bar.pct === 85
                        ? 'bg-primary'
                        : 'bg-surface-container-low hover:opacity-90'
                    )}
                    style={{ height: `${bar.pct}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="border-outline-variant text-on-surface-variant flex justify-between border-t px-2 pt-2 text-[11px] font-semibold tracking-wider uppercase">
              {warehouseBars.map((b) => (
                <span key={b.label}>{b.label}</span>
              ))}
            </div>
          </section>

          <section className="ambient-shadow border-outline-variant bg-surface-container-lowest relative h-64 overflow-hidden rounded-xl border">
            <div className="absolute inset-0 bg-surface-dim/20" />
            <div className="glass-panel border-outline-variant absolute top-4 left-4 rounded-lg border p-3">
              <h3 className="text-on-surface font-heading text-lg font-semibold">Logistik global</h3>
              <p className="text-on-surface-variant text-sm">3 pengiriman aktif</p>
            </div>
            <div className="text-on-surface-variant flex h-full items-center justify-center">
              <Globe className="size-12 opacity-20" aria-hidden />
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:space-y-8">
          <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
            <div className="border-outline-variant mb-3 flex items-center justify-between border-b pb-3">
              <h2 className="text-on-surface font-heading text-lg font-semibold">Kesehatan stok</h2>
              <span className="bg-error-container-app text-on-error-container-app rounded-full px-2 py-1 text-[11px] font-semibold tracking-wider uppercase">
                3 peringatan
              </span>
            </div>
            <ul className="space-y-2">
              {stockItems.map((row) => (
                <li
                  key={row.name}
                  className="border-surface-container-high flex items-center justify-between gap-3 border-b py-2 last:border-b-0"
                >
                  <div>
                    <div className="text-on-surface text-sm font-semibold">{row.name}</div>
                    <div
                      className={cn(
                        'text-[13px] font-medium tabular-nums',
                        row.alert ? 'text-error-app' : 'text-on-surface-variant'
                      )}
                    >
                      {row.units}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={cn(
                      'border-outline-variant rounded px-3 py-1 text-[11px] font-semibold tracking-wider uppercase transition-colors',
                      row.actionPrimary
                        ? 'bg-surface-app text-primary border hover:bg-surface-container-low'
                        : 'bg-surface-app text-on-surface-variant border hover:bg-surface-container-low'
                    )}
                  >
                    {row.action}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
            <div className="border-outline-variant mb-3 flex items-center justify-between border-b pb-3">
              <h2 className="text-on-surface font-heading text-lg font-semibold">Personel</h2>
              <Group className="text-on-surface-variant size-5" aria-hidden />
            </div>
            <div className="flex items-center gap-4 py-2">
              <div className="border-primary bg-surface-container-low text-primary flex size-16 items-center justify-center rounded-full border-4 border-r-surface-container-low">
                <span className="font-heading text-lg font-bold tabular-nums">85%</span>
              </div>
              <div>
                <div className="text-on-surface text-base">
                  <strong>142</strong> / 165
                </div>
                <div className="text-on-surface-variant text-sm">Staf sudah absen masuk</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
