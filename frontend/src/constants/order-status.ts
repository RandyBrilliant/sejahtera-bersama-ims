import type { OrderStatus } from '@/types/purchase'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: 'Menunggu Pembayaran',
  SUBMITTED: 'Menunggu Pembayaran',
  AWAITING_PAYMENT: 'Menunggu Pembayaran',
  PAYMENT_PROOF_UPLOADED: 'Sudah Bayar',
  VERIFIED: 'Pembayaran Diterima',
  CANCELLED: 'Dibatalkan',
}

/** Status yang masih boleh mengubah baris order pembelian / penjualan. */
export function canEditOrderLines(status: OrderStatus): boolean {
  return (
    status === 'DRAFT' ||
    status === 'SUBMITTED' ||
    status === 'AWAITING_PAYMENT'
  )
}

export function canDeleteOrder(status: OrderStatus): boolean {
  return status === 'DRAFT' || status === 'CANCELLED'
}
