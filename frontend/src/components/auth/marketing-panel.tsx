import { APP_BRAND_NAME } from '@/constants/brand'

type FeedTone = 'in' | 'out' | 'neutral'

type FeedItem = {
  module: string
  ref: string
  detail: string
  qty: string
  tone: FeedTone
}

const FEED: FeedItem[] = [
  { module: 'Pembelian', ref: 'PO-0412', detail: 'Barang diterima', qty: '+1.200 kg', tone: 'in' },
  { module: 'Produksi', ref: 'BATCH-118', detail: 'Batch selesai', qty: '+480 pak', tone: 'in' },
  { module: 'Penjualan', ref: 'SO-0931', detail: 'Pesanan dikemas', qty: '−96 pak', tone: 'out' },
  { module: 'Mutasi bahan', ref: 'MB-2207', detail: 'Pindah gudang', qty: '250 kg', tone: 'neutral' },
  { module: 'Kas', ref: 'KAS-0583', detail: 'Pembayaran masuk', qty: 'Lunas', tone: 'in' },
  { module: 'Penjualan', ref: 'SO-0932', detail: 'Surat jalan dicetak', qty: '−40 pak', tone: 'out' },
  { module: 'Absensi', ref: 'Shift pagi', detail: 'Presensi tercatat', qty: '24 staf', tone: 'neutral' },
  { module: 'Produksi', ref: 'BATCH-119', detail: 'Bahan dipakai', qty: '−310 kg', tone: 'out' },
]

const MODULES = ['Gudang', 'Produksi', 'Pesanan', 'Kas', 'Absensi', 'Gaji', 'HPP']

const TONE_DOT: Record<FeedTone, string> = {
  in: 'bg-emerald-300',
  out: 'bg-amber-300',
  neutral: 'bg-white/50',
}

function FeedRow({ item }: { item: FeedItem }) {
  return (
    <li className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3 last:border-b-0">
      <span className={`size-1.5 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white">{item.detail}</p>
        <p className="truncate text-[11px] text-white/50">
          {item.module} · <span className="font-mono">{item.ref}</span>
        </p>
      </div>
      <span className="shrink-0 font-mono text-[12px] text-white/80 tabular-nums">{item.qty}</span>
    </li>
  )
}

export function MarketingPanel() {
  return (
    <section
      aria-hidden
      className="auth-panel relative hidden overflow-hidden bg-primary text-white lg:flex lg:w-[46%] lg:flex-col xl:w-1/2"
    >
      <div className="auth-grid pointer-events-none absolute inset-0" />
      <div className="auth-glow pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full" />

      <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
        <div className="auth-rise flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-[10px] bg-white text-[13px] font-bold tracking-tight text-primary">
            SB
          </span>
          <span className="text-[15px] font-semibold tracking-tight">{APP_BRAND_NAME}</span>
        </div>

        <div className="max-w-xl">
          <h2
            className="auth-rise text-[clamp(2rem,3.2vw,3.25rem)] leading-[1.05] font-bold tracking-[-0.03em]"
            style={{ animationDelay: '80ms' }}
          >
            Gudang, produksi, dan pesanan
            <span className="text-white/45"> — dalam satu catatan.</span>
          </h2>

          <div
            className="auth-rise mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
            style={{ animationDelay: '160ms' }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
              <span className="text-[11px] font-medium tracking-wide text-white/60">Aktivitas terbaru</span>
              <span className="flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="auth-pulse size-1.5 rounded-full bg-emerald-300" />
                Langsung
              </span>
            </div>
            <div className="auth-feed-mask h-[264px]">
              <ul className="auth-ticker">
                {FEED.map((item) => (
                  <FeedRow key={`a-${item.ref}`} item={item} />
                ))}
                {FEED.map((item) => (
                  <FeedRow key={`b-${item.ref}`} item={item} />
                ))}
              </ul>
            </div>
          </div>
        </div>

        <ul className="auth-rise flex flex-wrap gap-x-5 gap-y-2" style={{ animationDelay: '240ms' }}>
          {MODULES.map((name) => (
            <li key={name} className="text-[12px] text-white/50">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
