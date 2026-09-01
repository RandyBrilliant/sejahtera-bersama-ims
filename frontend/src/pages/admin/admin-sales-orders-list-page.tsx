import { SalesOrdersTable } from '@/components/admin/orders/sales-orders-table'
import { WarehouseSalesPackingTable } from '@/components/admin/orders/warehouse-sales-packing-table'
import { useAuth } from '@/hooks/use-auth'

export function AdminSalesOrdersListPage() {
  const { user } = useAuth()
  if (user?.role === 'WAREHOUSE_STAFF') {
    return <WarehouseSalesPackingTable />
  }
  return <SalesOrdersTable />
}
