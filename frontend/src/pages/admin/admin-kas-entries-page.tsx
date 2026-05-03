import { OperationalCashEntriesTable } from '@/components/admin/kas/operational-cash-entries-table'

export function AdminKasEntriesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-on-surface font-heading text-lg font-semibold">Transaksi</h2>
      <OperationalCashEntriesTable />
    </div>
  )
}
