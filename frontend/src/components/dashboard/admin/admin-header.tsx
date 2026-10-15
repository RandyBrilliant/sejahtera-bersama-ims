import { ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, Zap } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { AdminQuickActionsDropdown } from '@/components/dashboard/admin/admin-quick-actions'

type AdminHeaderProps = {
  onMenuClick?: () => void
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}

const SEGMENT_LABEL: Record<string, string> = {
  dashboard: 'Beranda',
  analitik: 'Analitik',
  hpp: 'HPP & laba',
  pesanan: 'Pesanan',
  penjualan: 'Penjualan',
  pembelian: 'Pembelian',
  gudang: 'Gudang',
  'bahan-baku': 'Bahan baku',
  'stok-bahan': 'Stok bahan',
  produksi: 'Produksi',
  'mutasi-bahan': 'Penerimaan bahan',
  'mutasi-produk': 'Mutasi produk',
  produk: 'Produk',
  inventaris: 'Inventaris',
  kemasan: 'Kemasan',
  pelanggan: 'Pelanggan',
  kas: 'Kas operasional',
  kategori: 'Kategori',
  entri: 'Entri',
  gaji: 'Payroll',
  kompensasi: 'Kompensasi',
  'jenis-kupas': 'Jenis kupas',
  'input-kupas': 'Input kupas',
  slip: 'Slip',
  staf: 'Pengguna & staf',
  absensi: 'Presensi',
  tablet: 'Tablet',
  laporan: 'Laporan',
  scan: 'Pindai',
  pengaturan: 'Pengaturan',
  profil: 'Profil',
  presensi: 'Presensi saya',
  'slip-gaji': 'Slip gaji',
  baru: 'Baru',
  edit: 'Ubah',
}

/** Segments that have no page of their own, so they render as plain text. */
const NON_LINKABLE = new Set(['kemasan', 'slip'])
/** Parents whose `/:id` URL is a real detail page. */
const ID_DETAIL_PARENTS = new Set(['produksi', 'penjualan', 'pembelian', 'gaji', 'slip-gaji'])

/** Leaf labels that need their parent for context on narrow screens. */
const GENERIC_LEAF = new Set(['Detail', 'Ubah', 'Baru', 'Periode'])

type Crumb = { label: string; to: string; linkable: boolean }

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'Beranda', to: '/admin/dashboard', linkable: true }]

  return segments.map((seg, i) => {
    const to = `/admin/${segments.slice(0, i + 1).join('/')}`
    const parent = segments[i - 1]
    const isId = /^\d+$/.test(seg)
    if (isId) {
      return {
        label: parent === 'gaji' ? 'Periode' : 'Detail',
        to,
        linkable: parent != null && ID_DETAIL_PARENTS.has(parent),
      }
    }
    return {
      label: SEGMENT_LABEL[seg] ?? seg.replace(/-/g, ' '),
      to,
      linkable: !NON_LINKABLE.has(seg),
    }
  })
}

export function AdminHeader({ onMenuClick, sidebarCollapsed, onToggleSidebar }: AdminHeaderProps) {
  const { pathname } = useLocation()
  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname])
  const last = crumbs[crumbs.length - 1]!
  const parent = crumbs[crumbs.length - 2]
  const mobileTitle =
    parent && GENERIC_LEAF.has(last.label) ? `${parent.label} · ${last.label}` : last.label

  return (
    <header className="bg-surface-app/80 sticky top-0 z-40 flex h-16 w-full shrink-0 items-center gap-3 border-b border-slate-900/[0.06] px-4 backdrop-blur-md md:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ml-1.5 grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-900/[0.05] md:hidden"
        aria-label="Buka menu"
      >
        <Menu className="size-5" />
      </button>

      {onToggleSidebar ? (
        <>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="-ml-1.5 hidden size-8 place-items-center rounded-lg text-slate-400 transition-colors outline-none hover:bg-slate-900/[0.05] hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-primary/30 md:grid"
            aria-label={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          <span aria-hidden className="hidden h-4 w-px bg-slate-900/10 md:block" />
        </>
      ) : null}

      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900 sm:hidden">{mobileTitle}</p>

      <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 sm:block">
        <ol className="flex min-w-0 items-center gap-1 text-[13px]">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <Fragment key={c.to}>
                {i > 0 ? (
                  <li aria-hidden className="text-slate-300">
                    <ChevronRight className="size-3.5" />
                  </li>
                ) : null}
                <li className={isLast ? 'min-w-0' : 'shrink-0'}>
                  {isLast ? (
                    <span aria-current="page" className="block truncate font-semibold text-slate-900">
                      {c.label}
                    </span>
                  ) : c.linkable ? (
                    <Link
                      to={c.to}
                      className="rounded px-0.5 text-slate-500 transition-colors hover:text-slate-900"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="px-0.5 text-slate-500">{c.label}</span>
                  )}
                </li>
              </Fragment>
            )
          })}
        </ol>
      </nav>

      <AdminQuickActionsDropdown
        align="end"
        sideOffset={8}
        trigger={
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-slate-900/[0.08] bg-white px-2.5 text-[13px] font-medium text-slate-700 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-colors outline-none hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/30 data-[state=open]:bg-slate-50 sm:px-3"
            aria-label="Aksi cepat"
          >
            <Zap className="text-primary size-4" />
            <span className="hidden sm:inline">Aksi cepat</span>
          </button>
        }
      />
    </header>
  )
}
