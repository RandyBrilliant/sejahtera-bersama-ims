import { useMemo, useRef } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Badge } from '@/components/ui/badge'
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
import { useGoBack } from '@/hooks/use-go-back'
import type { SalesReceiptMode } from '@/api/purchase'
import {
  useCancelSalesOrderMutation,
  useDeleteSalesOrderMutation,
  useSalesOrderQuery,
  useSalesReceiptPdfMutation,
  useUploadSalesPaymentProofMutation,
  useVerifySalesOrderMutation,
} from '@/hooks/use-purchase-query'
import { alert } from '@/lib/alert'
import { formatIdr } from '@/lib/format-idr'
import { resolveMediaUrl } from '@/lib/media-url'
import {
  formatDecimalId,
  formatSalesOrderLineMassKg,
  salesOrderLinesTotalMassKg,
} from '@/lib/format-number-id'
import type { SalesOrderLine } from '@/types/purchase'

function fmtDt(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Effective harga/kg charged on this line (from resolved package price ÷ net mass). */
function effectivePricePerKgIdr(line: Pick<SalesOrderLine, 'unit_price_idr' | 'net_mass_kg'>): number {
  const mass = Number(String(line.net_mass_kg ?? '').replace(',', '.'))
  if (Number.isFinite(mass) && mass > 0) {
    return Math.round(line.unit_price_idr / mass)
  }
  return line.unit_price_idr
}

/** Catalog default package total from product harga/kg × net mass. */
function catalogPackagePriceIdr(line: Pick<SalesOrderLine, 'price_per_kg_idr' | 'net_mass_kg'>): number | null {
  if (line.price_per_kg_idr == null || line.price_per_kg_idr < 1) return null
  const mass = Number(String(line.net_mass_kg ?? '').replace(',', '.'))
  if (!Number.isFinite(mass) || mass <= 0) return null
  return Math.round(line.price_per_kg_idr * mass)
}

/** True when charged package price differs from product catalog default. */
function isCustomLinePrice(line: SalesOrderLine): boolean {
  const catalog = catalogPackagePriceIdr(line)
  if (catalog == null) return false
  return line.unit_price_idr !== catalog
}

const LIST_PATH = '/admin/pesanan/penjualan'

export function AdminSalesOrderDetailPage() {
  const goBack = useGoBack()
  const { orderId: idParam } = useParams<{ orderId: string }>()
  const id = Number(idParam)
  const validId = Number.isFinite(id) && id > 0
  const fileRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const isOwner = user?.role === 'LEADERSHIP'
  const isFinanceReadOnly = user?.role === 'FINANCE_STAFF'
  const isSalesStaff = user?.role === 'SALES_STAFF'
  const canCancelOrder = !isFinanceReadOnly && !isSalesStaff

  const { data: order, isLoading, isError, refetch } = useSalesOrderQuery(validId ? id : null)
  const uploadMut = useUploadSalesPaymentProofMutation(id)
  const verifyMut = useVerifySalesOrderMutation(id)
  const cancelMut = useCancelSalesOrderMutation(id)
  const deleteMut = useDeleteSalesOrderMutation()
  const receiptMut = useSalesReceiptPdfMutation()

  const totalMassKg = useMemo(
    () => (order?.lines ? salesOrderLinesTotalMassKg(order.lines) : 0),
    [order]
  )

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
      goBack(LIST_PATH)
    } catch (err) {
      alert.error('Gagal menghapus', parsePurchaseMutationError(err))
    }
  }

  async function handlePrintReceipt(mode: SalesReceiptMode) {
    // Open synchronously first so the popup blocker allows the tab.
    const printWindow = window.open('about:blank', '_blank')
    try {
      const blob = await receiptMut.mutateAsync({ orderId: id, mode })
      const pdfBlob =
        blob.type === 'application/pdf'
          ? blob
          : new Blob([blob], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)
      if (printWindow) {
        printWindow.location.replace(url)
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = `${order?.order_code ?? id}-nota-${mode}.pdf`
        link.rel = 'noopener'
        document.body.appendChild(link)
        link.click()
        link.remove()
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      printWindow?.close()
      alert.error('Gagal membuat nota', parsePurchaseMutationError(err))
    }
  }

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat…</p>
  }

  if (isError || !order) {
    return (
      <div className="space-y-4">
        <PageBackLink fallback={LIST_PATH} className="mb-0">
          ← Daftar penjualan
        </PageBackLink>
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
          <PageBackLink fallback={LIST_PATH}>← Daftar penjualan</PageBackLink>
          <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
            {order.order_code}
          </h2>
          <p className="text-on-surface-variant mt-1 text-sm">{order.customer_name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && !isFinanceReadOnly ? (
            <Button type="button" variant="outline" asChild>
              <Link to={`/admin/pesanan/penjualan/${id}/edit`}>Ubah order</Link>
            </Button>
          ) : null}
          {order.status !== 'CANCELLED' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handlePrintReceipt('preprinted')}
                disabled={receiptMut.isPending}
                title="Cetak hanya nilai untuk nota cetakan lama (Epson LQ 15 × 10,5 cm)"
              >
                {receiptMut.isPending && receiptMut.variables?.mode === 'preprinted'
                  ? 'Nota…'
                  : 'Cetak nota (form lama)'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handlePrintReceipt('full')}
                disabled={receiptMut.isPending}
                title="Cetak nota lengkap di kertas kosong (Epson LQ 15 × 10,5 cm)"
              >
                {receiptMut.isPending && receiptMut.variables?.mode === 'full'
                  ? 'Nota…'
                  : 'Cetak nota (form baru)'}
              </Button>
            </>
          ) : null}
          {!isFinanceReadOnly && canDeleteOrder(order.status) ? (
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
            <p>
              <span className="font-medium text-foreground">Total berat (order):</span>{' '}
              <span className="tabular-nums">{formatDecimalId(totalMassKg)} kg</span>
              <span className="text-on-surface-variant block text-xs leading-relaxed">
                Jumlah kemasan × berat bersih per kemasan (kg).
              </span>
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
                  href={resolveMediaUrl(order.payment_proof) ?? '#'}
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
        {!isFinanceReadOnly && showUpload ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploadMut.isPending}
          >
            {uploadMut.isPending ? 'Mengunggah…' : 'Unggah bukti pembayaran'}
          </Button>
        ) : null}
        {canCancelOrder &&
        order.status !== 'VERIFIED' &&
        order.status !== 'CANCELLED' ? (
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
                <TableHead className="text-right">Berat (kg)</TableHead>
                <TableHead className="text-right">Harga (kg)</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map((line) => {
                const custom = isCustomLinePrice(line)
                const perKg = effectivePricePerKgIdr(line)
                return (
                  <TableRow key={line.id} className="border-outline-variant">
                    <TableCell>{line.product_variant_name}</TableCell>
                    <TableCell>{line.packaging_label}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatDecimalId(line.quantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatSalesOrderLineMassKg(line)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="tabular-nums">{formatIdr(perKg)}</span>
                        {custom ? (
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            Harga khusus
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIdr(line.line_total_idr)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
