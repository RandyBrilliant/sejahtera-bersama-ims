import { Badge } from '@/components/ui/badge'
import { ORDER_STATUS_LABEL } from '@/constants/order-status'
import type { OrderStatus } from '@/types/purchase'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variant =
    status === 'VERIFIED'
      ? 'default'
      : status === 'CANCELLED'
        ? 'secondary'
        : status === 'PAYMENT_PROOF_UPLOADED' || status === 'AWAITING_PAYMENT'
          ? 'outline'
          : 'secondary'

  return <Badge variant={variant}>{ORDER_STATUS_LABEL[status] ?? status}</Badge>
}
