import { PageBackLink } from '@/components/navigation/page-back-link'
import { OrderStatusBadge } from '@/components/admin/orders/order-status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PACKAGING_TYPE_LABEL } from '@/constants/packaging-types'
import {
  formatKgId,
  formatOneKemasanMass,
  orderTotalMassKg,
  productDisplayName,
} from '@/lib/format-packaging-mass'
import { formatSalesOrderLineMassKg } from '@/lib/format-number-id'
import type { SalesOrder } from '@/types/purchase'

const LIST_PATH = '/admin/pesanan/penjualan'

type Props = {
  order: SalesOrder
}

export function WarehouseSalesOrderPackingDetail({ order }: Props) {
  const totalKg = orderTotalMassKg(order)

  return (
    <div className="space-y-6">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Daftar penjualan</PageBackLink>
        <h2 className="text-on-surface font-heading text-xl font-semibold tracking-tight">
          {order.order_code}
        </h2>
        <p className="text-on-surface-variant mt-1 text-sm">
          Packing: jenis produk, kemasan, dan total berat. 1 ons = 0,1 kg.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <span className="text-on-surface text-sm font-semibold tabular-nums">
          Total {formatKgId(totalKg)}
        </span>
      </div>

      <Card className="border-outline-variant bg-card">
        <CardHeader>
          <CardTitle className="text-base">Isi packing</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0 md:p-6">
          <Table>
            <TableHeader>
              <TableRow className="border-outline-variant">
                <TableHead>Produk</TableHead>
                <TableHead>Jenis kemasan</TableHead>
                <TableHead>Kemasan</TableHead>
                <TableHead>1 kemasan</TableHead>
                <TableHead className="text-right">Total berat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.length === 0 ? (
                <TableRow className="border-outline-variant">
                  <TableCell colSpan={5} className="text-on-surface-variant py-8 text-center text-sm">
                    Tidak ada baris packing.
                  </TableCell>
                </TableRow>
              ) : (
                order.lines.map((line) => (
                  <TableRow key={line.id} className="border-outline-variant">
                    <TableCell className="font-medium">{productDisplayName(line)}</TableCell>
                    <TableCell>
                      {line.packaging_type ? (
                        <Badge variant="secondary">
                          {PACKAGING_TYPE_LABEL[line.packaging_type]}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{line.packaging_label}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {formatOneKemasanMass(line.net_mass_kg)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatSalesOrderLineMassKg(line)} kg
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {order.notes ? (
        <p className="text-on-surface-variant text-sm leading-relaxed">
          <span className="text-on-surface font-medium">Catatan:</span> {order.notes}
        </p>
      ) : null}
    </div>
  )
}
