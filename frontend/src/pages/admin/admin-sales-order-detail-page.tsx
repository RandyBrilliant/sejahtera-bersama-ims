import { useRef } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { canDeleteOrder, canEditOrderLines } from '@/constants/order-status'
import { useAuth } from '@/hooks/use-auth'
import {
  useCancelSalesOrderMutation,
  useDeleteSalesOrderMutation,
  useSalesInvoicePdfMutation,
  useSalesOrderQuery,
  useUploadSalesPaymentProofMutation,
  useVerifySalesOrderMutation,
} from '@/hooks/use-purchase-query'
import { alert } from '@/lib/alert'
import { formatIdr } from '@/lib/format-idr'

function fmtDt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

export function AdminSalesOrderDetailPage() {
  const navigate = useNavigate()
  const { orderId: idParam } = useParams<{ orderId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0
  const fileRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const isOwner = user?.role === 'LEADERSHIP'

  const { data: order, isLoading, isError, refetch } = useSalesOrderQuery(validId ? id : null)
  const uploadMut = useUploadSalesPaymentProofMutation(id)
  const verifyMut = useVerifySalesOrderMutation(id)
  const cancelMut = useCancelSalesOrderMutation(id)
  const deleteMut = useDeleteSalesOrderMutation()
  const pdfMut = useSalesInvoicePdfMutation()

  if (!validId) {
    return <Navigate to="/admin/pesanan/penjualan" replace />
  }

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      await uploadMut.mutateAsync(f)
      alert.success('Berhasil', 'Bukti pembayaran diunggah.')
      await refetch()
    } catch (err) {
      alert.error('Gagal mengunggah', parsePurchaseMutationError(err))
    }
  }

  async function handleVerify() {
    try {
      await verifyMut.mutateAsync()
      alert.success('Berhasil', 'Order diverifikasi dan stok produk dikurangi.')
      await refetch()
    } catch (err) {
      alert.error('Gagal verifikasi', parsePurchaseMutationError(err))
    }
  }

  async function handleCancel() {
    if (!window.confirm('Batalkan order ini?')) return
    try {
      await cancelMut.mutateAsync()
      alert.success('Berhasil', 'Order dibatalkan.')
      await refetch()
    } catch (err) {
      alert.error('Gagal', parsePurchaseMutationError(err))
    }
  }

  async function handleDelete() {
    if (!window.confirm('Hapus permanen order draft/cancelled ini?')) return
    try {
      await deleteMut.mutateAsync(id)
      alert.success('Berhasil', 'Order dihapus.')
      navigate('/admin/pesanan/penjualan')
    } catch (err) {
      alert.error('Gagal menghapus', parsePurchaseMutationError(err))
    }
  }

  async function handleDownloadPdf() {
    try {
      const blob = await pdfMut.mutateAsync(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = order ? `${order.order_code}-invoice.pdf` : 'invoice.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert.error('Gagal unduh PDF', parsePurchaseMutationError(err))
    }
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat…</p>
  }

  if (isError || !order) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/pesanan/penjualan"
          className="text-on-surface-variant hover:text-primary text-sm font-medium"
        >
          ← Daftar penjualan
        </Link>
        <p className="text-destructive text-sm">Order tidak ditemukan.</p>
      </div>
    )
  }

  const canEdit = canEditOrderLines(order.status)
  const canVerify =
    isOwner &&
    order.status !== 'VERIFIED' &&
    order.status !== 'CANCELLED' &&
    (order.status === 'PAYMENT_PROOF_UPLOADED' ||
      (order.status === 'AWAITING_PAYMENT' && !!order.payment_proof))
  const showUpload =
    order.status !== 'VERIFIED' &&
    order.status !== 'CANCELLED'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/admin/pesanan/penjualan"
            className="text-on-surface-variant hover:text-primary mb-2 inline-block text-sm font-medium"
          >
            ← Daftar penjualan
          </Link>
          <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
            {order.order_code}
          </h2>
          <p className="text-on-surface-variant mt-1 text-sm">{order.customer_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button type="button" variant="outline" asChild>
              <Link to={`/admin/pesanan/penjualan/${id}/edit`}>Ubah order</Link>
            </Button>
          ) : null}
          {order.status !== 'CANCELLED' ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDownloadPdf()}
              disabled={pdfMut.isPending}
            >
              {pdfMut.isPending ? 'PDF…' : 'Unduh invoice PDF'}
            </Button>
          ) : null}
          {canDeleteOrder(order.status) ? (
            <Button
              type="button"
              variant="default"
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void handleDelete()}
              disabled={deleteMut.isPending}
            >
              Hapus
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-outline-variant bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="text-on-surface-variant space-y-1 text-sm">
            <p>
              <span className="font-medium text-foreground">Subtotal:</span>{' '}
              {formatIdr(order.subtotal_idr)}
            </p>
            <p>
              <span className="font-medium text-foreground">Pajak:</span>{' '}
              {formatIdr(order.tax_amount_idr)}
            </p>
            <p>
              <span className="font-medium text-foreground">Total:</span>{' '}
              {formatIdr(order.total_idr)}
            </p>
            <p>
              <span className="font-medium text-foreground">Faktur:</span> {order.invoice_number || '—'}
            </p>
            <p>
              <span className="font-medium text-foreground">Catatan:</span> {order.notes || '—'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-outline-variant bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="text-on-surface-variant space-y-2 text-sm">
            <p>Bukti diunggah: {fmtDt(order.payment_proof_uploaded_at)}</p>
            {order.payment_proof ? (
              <p>
                <a
                  href={order.payment_proof}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium underline"
                >
                  Lihat bukti TF
                </a>
              </p>
            ) : (
              <p>Belum ada bukti pembayaran.</p>
            )}
            <p>Verifikasi: {fmtDt(order.verified_at)}</p>
            <p>
              Oleh:{' '}
              {order.verified_by?.full_name ?? order.verified_by?.username ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <input
        ref={fileRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf"
        onChange={handleUploadFile}
      />

      <div className="flex flex-wrap gap-2">
        {showUpload ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploadMut.isPending}
          >
            {uploadMut.isPending ? 'Mengunggah…' : 'Unggah bukti pembayaran'}
          </Button>
        ) : null}
        {order.status !== 'VERIFIED' && order.status !== 'CANCELLED' ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleCancel()}
            disabled={cancelMut.isPending}
          >
            Batalkan order
          </Button>
        ) : null}
        {canVerify ? (
          <Button type="button" onClick={() => void handleVerify()} disabled={verifyMut.isPending}>
            {verifyMut.isPending ? 'Memproses…' : 'Verifikasi (owner)'}
          </Button>
        ) : null}
      </div>

      <Card className="border-outline-variant bg-card">
        <CardHeader>
          <CardTitle className="text-base">Baris produk</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 md:p-6">
          <Table>
            <TableHeader>
              <TableRow className="border-outline-variant">
                <TableHead>Produk</TableHead>
                <TableHead>Kemasan</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Harga</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map((line) => (
                <TableRow key={line.id} className="border-outline-variant">
                  <TableCell>{line.product_variant_name}</TableCell>
                  <TableCell>{line.packaging_label}</TableCell>
                  <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIdr(line.unit_price_idr)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatIdr(line.line_total_idr)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
