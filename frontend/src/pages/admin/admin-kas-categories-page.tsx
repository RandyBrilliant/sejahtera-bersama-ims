import { OperationalCategoriesTable } from '@/components/admin/kas/operational-categories-table'

export function AdminKasCategoriesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-on-surface font-heading text-lg font-semibold">Kategori</h2>
      <OperationalCategoriesTable />
    </div>
  )
}
