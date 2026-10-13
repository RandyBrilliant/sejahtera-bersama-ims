import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Checkbox } from '@/components/ui/checkbox'
import { useSetSalesOrderPreparedMutation } from '@/hooks/use-purchase-query'
import { alert } from '@/lib/alert'
import type { SalesOrder } from '@/types/purchase'

function preparedTitle(order: SalesOrder): string {
  if (!order.prepared_at) return 'Tandai pesanan sudah disiapkan'
  const when = new Date(order.prepared_at).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const who = order.prepared_by?.full_name || order.prepared_by?.username
  return who ? `Disiapkan oleh ${who} · ${when}` : `Disiapkan · ${when}`
}

/** Packing checklist cell: ticked once gudang has prepared the order. */
export function SalesOrderPreparedCheckbox({ order }: { order: SalesOrder }) {
  const mut = useSetSalesOrderPreparedMutation()
  const prepared = mut.isPending ? !!mut.variables?.prepared : !!order.prepared_at
  const disabled = mut.isPending || (order.status === 'CANCELLED' && !order.prepared_at)

  const toggle = async (next: boolean) => {
    try {
      await mut.mutateAsync({ orderId: order.id, prepared: next })
    } catch (err) {
      alert.error('Gagal memperbarui', parsePurchaseMutationError(err))
    }
  }

  return (
    <div className="flex justify-center" title={preparedTitle(order)}>
      <Checkbox
        className="size-5"
        checked={prepared}
        disabled={disabled}
        onCheckedChange={(v) => void toggle(v === true)}
        aria-label={`Pesanan ${order.order_code} sudah disiapkan`}
      />
    </div>
  )
}
