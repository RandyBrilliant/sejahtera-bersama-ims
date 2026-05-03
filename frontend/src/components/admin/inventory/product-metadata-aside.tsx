import { formatAuditDateTime } from '@/lib/format-audit-datetime'
import type { Product } from '@/types/inventory'

export function ProductMetadataAside({ product }: { product: Product }) {
  return (
    <aside className="border-outline-variant bg-surface-container-lowest ambient-shadow lg:sticky lg:top-20 space-y-4 rounded-xl border p-6">
      <div>
        <h2 className="text-on-surface mb-4 text-sm font-semibold tracking-wide uppercase">
          Metadata produk
        </h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">ID</dt>
            <dd className="text-on-surface mt-0.5 font-mono">{product.id}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Nama</dt>
            <dd className="text-on-surface mt-0.5">{product.name}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Varian</dt>
            <dd className="text-on-surface mt-0.5">{product.variant_name}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Status</dt>
            <dd className="text-on-surface mt-0.5">{product.is_active ? 'Aktif' : 'Nonaktif'}</dd>
          </div>
        </dl>
      </div>
      <div className="border-outline-variant border-t pt-4">
        <h2 className="text-on-surface mb-4 text-sm font-semibold tracking-wide uppercase">Audit</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Dibuat</dt>
            <dd className="text-on-surface mt-0.5">{formatAuditDateTime(product.created_at)}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Diubah</dt>
            <dd className="text-on-surface mt-0.5">{formatAuditDateTime(product.updated_at)}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Dibuat oleh</dt>
            <dd className="text-on-surface mt-0.5">
              {product.created_by?.full_name ?? product.created_by?.username ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Diubah oleh</dt>
            <dd className="text-on-surface mt-0.5">
              {product.updated_by?.full_name ?? product.updated_by?.username ?? '—'}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  )
}
