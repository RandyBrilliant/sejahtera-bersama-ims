import type { OrderStatus } from '@/types/purchase'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  AWAITING_PAYMENT: 'Menunggu bayar',
  PAYMENT_PROOF_UPLOADED: 'Bukti diunggah',
  VERIFIED: 'Terverifikasi',
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
