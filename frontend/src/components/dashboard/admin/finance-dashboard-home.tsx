import { Banknote, Landmark, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { ENTRY_KIND_LABEL, PAYMENT_METHOD_LABEL } from '@/constants/expenses'
import { fetchOperationalCashEntries, fetchOperationalCashSummary } from '@/api/expenses'
import { Button } from '@/components/ui/button'
import { formatIdr } from '@/lib/format-idr'

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Rentang ±30 hari termasuk hari ini (ringkas untuk KPI kas). */
function rollingMonthRange(): { start: string; end: string } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 29)
  return { start: toYMD(start), end: toYMD(end) }
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { dateStyle: 'medium' })
}

export function FinanceDashboardHome() {
  const { start, end } = rollingMonthRange()

  const summary = useQuery({
    queryKey: ['finance-dashboard', 'cash-summary', start, end],
    queryFn: () => fetchOperationalCashSummary(start, end),
  })

  const recent = useQuery({
    queryKey: ['finance-dashboard', 'recent-entries'],
    queryFn: () =>
      fetchOperationalCashEntries({
        page: 1,
        page_size: 8,
        ordering: '-occurred_on,-created_at',
      }),
  })

  const s = summary.data
  const rows = recent.data?.results ?? []
  const pending = summary.isPending || recent.isPending

  const incomeTotal = s ? Number(s.income.total_idr) : 0
  const expenseTotal = s ? Number(s.expense.total_idr) : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Dasbor keuangan
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            Kas operasional, arus kas bersih ({fmtDate(start)} – {fmtDate(end)}), dan entri terbaru.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/analitik">Analitik</Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/admin/kas/entri/baru">Entri kas</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <TrendingUp className="size-4" /> Pemasukan (30 hari)
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {pending ? '—' : formatIdr(incomeTotal)}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs tabular-nums">
            {s ? `${s.income.line_count.toLocaleString('id-ID')} baris` : '—'}
          </p>
        </div>
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <TrendingDown className="size-4" /> Pengeluaran (30 hari)
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {pending ? '—' : formatIdr(expenseTotal)}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs tabular-nums">
            {s ? `${s.expense.line_count.toLocaleString('id-ID')} baris` : '—'}
          </p>
        </div>
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Banknote className="size-4" /> Arus bersih (30 hari)
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {pending || !s ? '—' : formatIdr(s.net_cash_idr)}
          </p>
          <p className="text-on-surface-variant mt-1 text-xs">Pemasukan − pengeluaran</p>
        </div>
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Receipt className="size-4" /> Akses cepat
          </div>
          <ul className="text-on-surface-variant space-y-1 text-sm">
            <li className="flex items-center gap-2">
              <Wallet className="size-4 shrink-0" />
              <Link to="/admin/kas/entri" className="text-primary font-medium hover:underline">
                Daftar entri kas
              </Link>
            </li>
            <li className="flex items-center gap-2">
              <Landmark className="size-4 shrink-0" />
              <Link to="/admin/kas/kategori" className="text-primary font-medium hover:underline">
                Kategori kas
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between border-b pb-3">
          <h2 className="text-on-surface font-heading text-lg font-semibold">Entri kas terbaru</h2>
          <Link to="/admin/kas/entri" className="text-primary text-sm font-medium hover:underline">
            Lihat semua
          </Link>
        </div>
        {recent.isPending ? (
          <p className="text-on-surface-variant text-sm">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm">Belum ada entri kas.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id}>
                <Link
                  to={`/admin/kas/entri/${row.id}/edit`}
                  className="border-outline-variant hover:bg-surface-container-low bg-surface-container-lowest flex flex-col gap-1 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="text-on-surface-variant text-xs">{fmtDate(row.occurred_on)}</span>
                    <p className="text-on-surface truncate text-sm font-medium">
                      {row.description || row.reference || `#${row.id}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-on-surface-variant text-xs font-medium">
                      {PAYMENT_METHOD_LABEL[row.payment_method]}
                    </span>
                    <span className="text-on-surface-variant text-xs">{ENTRY_KIND_LABEL[row.direction]}</span>
                    <span className="text-on-surface tabular-nums text-sm font-semibold">
                      {formatIdr(row.amount_idr)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
