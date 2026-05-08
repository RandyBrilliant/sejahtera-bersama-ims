import type { EntryKind, PaymentMethod } from '@/types/expenses'

export const ENTRY_KIND_LABEL: Record<EntryKind, string> = {
  INCOME: 'Pemasukan',
  EXPENSE: 'Pengeluaran',
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  TRANSFER: 'Transfer',
}
