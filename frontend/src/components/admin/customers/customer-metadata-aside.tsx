import { formatAuditDateTime } from '@/lib/format-audit-datetime'
import { formatRegionalPhonePreview } from '@/lib/regional-phone'
import type { Customer } from '@/types/purchase'

export function CustomerMetadataAside({ customer }: { customer: Customer }) {
  return (
    <aside className="border-outline-variant bg-surface-container-lowest ambient-shadow lg:sticky lg:top-20 space-y-4 rounded-xl border p-6">
      <div>
        <h2 className="text-on-surface mb-4 text-sm font-semibold tracking-wide uppercase">
          Metadata pelanggan
        </h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">ID pelanggan</dt>
            <dd className="text-on-surface mt-0.5 font-mono">{customer.id}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Nama</dt>
            <dd className="text-on-surface mt-0.5 min-w-0 break-words">{customer.name}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Telepon</dt>
            <dd className="text-on-surface mt-0.5 min-w-0 break-words">
              {formatRegionalPhonePreview(customer.phone)}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Wilayah</dt>
            <dd className="text-on-surface mt-0.5">{customer.wilayah_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Alamat</dt>
            <dd className="text-on-surface mt-0.5 min-w-0 break-words">
              {customer.address || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Status</dt>
            <dd className="text-on-surface mt-0.5">{customer.is_active ? 'Aktif' : 'Nonaktif'}</dd>
          </div>
        </dl>
      </div>

      <div className="border-outline-variant border-t pt-4">
        <h2 className="text-on-surface mb-4 text-sm font-semibold tracking-wide uppercase">Audit</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Dibuat</dt>
            <dd className="text-on-surface mt-0.5">{formatAuditDateTime(customer.created_at)}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">
              Terakhir diubah
            </dt>
            <dd className="text-on-surface mt-0.5">{formatAuditDateTime(customer.updated_at)}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">Dibuat oleh</dt>
            <dd className="text-on-surface mt-0.5">
              {customer.created_by?.full_name || customer.created_by?.username || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant text-xs font-medium uppercase">
              Diubah terakhir oleh
            </dt>
            <dd className="text-on-surface mt-0.5">
              {customer.updated_by?.full_name || customer.updated_by?.username || '—'}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  )
}
