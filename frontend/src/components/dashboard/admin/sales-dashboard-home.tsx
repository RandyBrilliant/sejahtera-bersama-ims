import { CheckCircle2, Clock3, Receipt, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'

import { fetchSalesOrders } from '@/api/purchase'
import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { Button } from '@/components/ui/button'
import { useCustomersQuery, useSalesOrdersQuery } from '@/hooks/use-purchase-query'
import { formatIdr } from '@/lib/format-idr'

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { dateStyle: 'medium' })
}

export function SalesDashboardHome() {
  const [ordersTotal, ordersVerified, ordersAwaiting] = useQueries({
    queries: [
      {
        queryKey: ['sales-dashboard', 'orders-total'],
        queryFn: () => fetchSalesOrders({ page: 1, page_size: 1 }),
      },
      {
        queryKey: ['sales-dashboard', 'orders-verified'],
        queryFn: () => fetchSalesOrders({ page: 1, page_size: 1, status: 'VERIFIED' }),
      },
      {
        queryKey: ['sales-dashboard', 'orders-awaiting'],
        queryFn: () => fetchSalesOrders({ page: 1, page_size: 1, status: 'AWAITING_PAYMENT' }),
      },
    ],
  })

  const recentSales = useSalesOrdersQuery({
    page: 1,
    page_size: 6,
    ordering: '-created_at',
  })
  const customers = useCustomersQuery({ page: 1, page_size: 1 })

  const rows = recentSales.data?.results ?? []
  const totalOrders = ordersTotal.data?.count ?? 0
  const verifiedOrders = ordersVerified.data?.count ?? 0
  const awaitingPayment = ordersAwaiting.data?.count ?? 0
  const customerCount = customers.data?.count ?? 0

  const pending = ordersTotal.isPending || ordersVerified.isPending || recentSales.isPending

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
            Dasbor penjualan
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
            Fokus pada pesanan penjualan, pelanggan aktif, dan tindak lanjut pembayaran.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/admin/pelanggan">Pelanggan</Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/admin/pesanan/penjualan/baru">Order penjualan</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Receipt className="size-4" /> Total order
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {pending ? '—' : totalOrders.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <CheckCircle2 className="size-4" /> Terverifikasi
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {pending ? '—' : verifiedOrders.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Clock3 className="size-4" /> Menunggu bayar
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {pending ? '—' : awaitingPayment.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4">
          <div className="text-on-surface-variant mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
            <Users className="size-4" /> Pelanggan
          </div>
          <p className="text-on-surface font-heading text-2xl font-semibold tabular-nums">
            {customers.isPending ? '—' : customerCount.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <section className="ambient-shadow border-outline-variant bg-surface-container-lowest rounded-xl border p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between border-b pb-3">
          <h2 className="text-on-surface font-heading text-lg font-semibold">Order penjualan terbaru</h2>
          <Link to="/admin/pesanan/penjualan" className="text-primary text-sm font-medium hover:underline">
            Lihat semua
          </Link>
        </div>
        {recentSales.isPending ? (
          <p className="text-on-surface-variant text-sm">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="text-on-surface-variant text-sm">Belum ada order penjualan.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="border-outline-variant flex items-center justify-between gap-3 border-b py-2 last:border-b-0"
              >
                <div>
                  <p className="text-on-surface text-sm font-semibold">{row.order_code}</p>
                  <p className="text-on-surface-variant text-xs">
                    {row.customer_name} · {fmtDate(row.created_at)} ·{' '}
                    <span className="tabular-nums">{formatIdr(row.total_idr)}</span>
                  </p>
                </div>
                <OrderStatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
