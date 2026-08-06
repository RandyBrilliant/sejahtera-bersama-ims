import { useMemo, useState } from 'react'
import { ChevronDown, Minus, Plus, Search, Trash2 } from 'lucide-react'
import { PageBackLink } from '@/components/navigation/page-back-link'

import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RegionalPhoneInput } from '@/components/ui/regional-phone-input'
import { DatePickerInput } from '@/components/ui/date-picker-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CurrencyInput } from '@/components/ui/currency-input'
import { alert } from '@/lib/alert'
import { formatIdr } from '@/lib/format-idr'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { useProductPackagingListQuery } from '@/hooks/use-inventory-query'
import {
  useCreateCustomerMutation,
  useCreateSalesOrderMutation,
  useCustomersQuery,
  useSalesOrderQuery,
  useUpdateSalesOrderMutation,
  useWilayahQuery,
} from '@/hooks/use-purchase-query'
import { canEditOrderLines } from '@/constants/order-status'
import { PACKAGING_TYPE_LABEL } from '@/constants/packaging-types'
import type { ProductPackaging } from '@/types/inventory'
import type { SalesOrder, SalesOrderLineInput } from '@/types/purchase'

const listParams = { page: 1, page_size: 500 } as const

function isoTomorrowLocal(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function defaultSalesInvoiceNumber(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `INV-SO-${yyyy}${mm}${dd}-${hh}${mi}${ss}`
}

/** Cart line, keyed by product_packaging id (duplicates always merge). */
type CartItem = {
  product_packaging: number
  quantity: string
  /** Optional custom price per kg (IDR) for this order; blank = product default. */
  unit_price_per_kg_idr: string
}

function massKgOf(pkg: ProductPackaging | undefined): number {
  if (!pkg) return 0
  const m = Number(String(pkg.net_mass_kg).replace(',', '.'))
  return Number.isFinite(m) ? m : 0
}

function perKgFromLine(unitPriceIdr: number, netMassKg: string | undefined): string {
  const unit = Number(unitPriceIdr)
  const mass = Number(String(netMassKg ?? '').replace(',', '.'))
  if (!Number.isFinite(unit) || !Number.isFinite(mass) || mass <= 0) return ''
  return String(Math.round(unit / mass))
}

function fmtKgLabel(netMassKg: string): string {
  const kg = Number(String(netMassKg).replace(',', '.'))
  return Number.isFinite(kg)
    ? `${kg.toLocaleString('id-ID', { maximumFractionDigits: 6 })} kg`
    : netMassKg
}

function fmtStock(v: string): string {
  const n = Number(v)
  if (Number.isNaN(n)) return v
  return n.toLocaleString('id-ID', { maximumFractionDigits: 1 })
}

function fmtKg(kg: number): string {
  return Number.isFinite(kg)
    ? kg.toLocaleString('id-ID', { maximumFractionDigits: 3 })
    : '0'
}

function RequiredAsterisk() {
  return (
    <span className="text-destructive" aria-hidden>
      {' '}
      *
    </span>
  )
}

function cartFromInitial(order: SalesOrder | null, allowCustomPrice: boolean): CartItem[] {
  if (!order?.lines?.length) return []
  return order.lines.map((l) => {
    if (!allowCustomPrice) {
      return {
        product_packaging: l.product_packaging,
        quantity: String(l.quantity),
        unit_price_per_kg_idr: '',
      }
    }
    const mass = Number(String(l.net_mass_kg ?? '').replace(',', '.'))
    const perKgDefault = l.price_per_kg_idr ?? null
    const defaultUnit =
      perKgDefault != null && Number.isFinite(mass) && mass > 0
        ? Math.round(perKgDefault * mass)
        : null
    const isCustom = defaultUnit == null || l.unit_price_idr !== defaultUnit
    return {
      product_packaging: l.product_packaging,
      quantity: String(l.quantity),
      unit_price_per_kg_idr: isCustom ? perKgFromLine(l.unit_price_idr, l.net_mass_kg) : '',
    }
  })
}

type InnerProps = {
  mode: 'create' | 'edit'
  orderId?: number
  initial: SalesOrder | null
  onCancel: () => void
  onSaved: (id: number) => void
}

function SalesOrderFormInner({ mode, orderId, initial, onCancel, onSaved }: InnerProps) {
  const { user } = useAuth()
  const isSalesStaff = user?.role === 'SALES_STAFF'
  const canSetCustomPrice = !isSalesStaff
  /** Sales may only change cart lines when editing — nota header stays locked. */
  const lockNotaDetails = mode === 'edit' && isSalesStaff

  const customersQuery = useCustomersQuery({ ...listParams, is_active: true })
  const wilayahQuery = useWilayahQuery({ page: 1, page_size: 200, ordering: 'name' })
  const packagingQuery = useProductPackagingListQuery(listParams)

  const customers = useMemo(() => customersQuery.data?.results ?? [], [customersQuery.data?.results])
  const packagingRows = useMemo(
    () => packagingQuery.data?.results ?? [],
    [packagingQuery.data?.results]
  )
  const packagingById = useMemo(() => {
    const map = new Map<number, ProductPackaging>()
    for (const p of packagingRows) map.set(p.id, p)
    return map
  }, [packagingRows])

  const [customerId, setCustomerId] = useState<number | ''>(() =>
    initial?.customer != null ? initial.customer : ''
  )
  const [invoiceNumber, setInvoiceNumber] = useState(() => {
    if (initial?.invoice_number) return initial.invoice_number
    return mode === 'create' ? defaultSalesInvoiceNumber() : ''
  })
  const [invoiceDate, setInvoiceDate] = useState(() =>
    initial?.invoice_date ? initial.invoice_date.slice(0, 10) : isoTomorrowLocal()
  )
  const [notes, setNotes] = useState(() =>
    initial?.notes != null ? initial.notes.toUpperCase() : ''
  )
  const [cart, setCart] = useState<CartItem[]>(() => cartFromInitial(initial, canSetCustomPrice))
  const [expandedCustom, setExpandedCustom] = useState<Set<number>>(new Set())

  const [catalogSearch, setCatalogSearch] = useState('')
  const [variantFilter, setVariantFilter] = useState<string>('__all')
  const [fakturOpen, setFakturOpen] = useState(false)

  const [customerSearch, setCustomerSearch] = useState('')
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerAddress, setNewCustomerAddress] = useState('')
  const [newCustomerNotes, setNewCustomerNotes] = useState('')
  const [newCustomerWilayahId, setNewCustomerWilayahId] = useState('__none')

  const createCustomerMut = useCreateCustomerMutation()
  const createMut = useCreateSalesOrderMutation()
  const updateMut = useUpdateSalesOrderMutation(orderId ?? 0)
  const pending = createMut.isPending || updateMut.isPending

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) => {
      return (
        c.name.toLowerCase().includes(q) ||
        (c.wilayah_name ?? '').toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      )
    })
  }, [customerSearch, customers])

  const activePackaging = useMemo(
    () => packagingRows.filter((p) => p.is_active),
    [packagingRows]
  )

  const variants = useMemo(() => {
    const set = new Set<string>()
    for (const p of activePackaging) set.add(p.product_variant_name)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id-ID'))
  }, [activePackaging])

  const filteredPackaging = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    return activePackaging.filter((p) => {
      if (variantFilter !== '__all' && p.product_variant_name !== variantFilter) return false
      if (!q) return true
      return (
        p.product_variant_name.toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q)
      )
    })
  }, [activePackaging, catalogSearch, variantFilter])

  const cartQtyById = useMemo(() => {
    const map = new Map<number, number>()
    for (const it of cart) map.set(it.product_packaging, Number(it.quantity) || 0)
    return map
  }, [cart])

  function unitTotalFor(item: CartItem): number {
    const pkg = packagingById.get(item.product_packaging)
    if (!pkg) return 0
    const custom = item.unit_price_per_kg_idr.trim()
    if (custom) {
      const perKg = Number(custom)
      const mass = massKgOf(pkg)
      if (Number.isFinite(perKg) && perKg > 0 && mass > 0) return Math.round(perKg * mass)
    }
    return pkg.total_price_idr
  }

  const grandTotal = useMemo(() => {
    return cart.reduce((sum, it) => sum + (Number(it.quantity) || 0) * unitTotalFor(it), 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, packagingById])

  const totalItems = useMemo(
    () => cart.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
    [cart]
  )

  const totalKg = useMemo(
    () =>
      cart.reduce(
        (sum, it) =>
          sum + (Number(it.quantity) || 0) * massKgOf(packagingById.get(it.product_packaging)),
        0
      ),
    [cart, packagingById]
  )

  const totalKgLabel = totalKg.toLocaleString('id-ID', { maximumFractionDigits: 3 })

  function addToCart(id: number) {
    setCart((prev) => {
      const found = prev.find((it) => it.product_packaging === id)
      if (found) {
        return prev.map((it) =>
          it.product_packaging === id
            ? { ...it, quantity: String((Number(it.quantity) || 0) + 1) }
            : it
        )
      }
      return [...prev, { product_packaging: id, quantity: '1', unit_price_per_kg_idr: '' }]
    })
  }

  function stepQty(id: number, delta: number) {
    setCart((prev) =>
      prev.flatMap((it) => {
        if (it.product_packaging !== id) return [it]
        const next = (Number(it.quantity) || 0) + delta
        if (next < 1) return []
        return [{ ...it, quantity: String(next) }]
      })
    )
  }

  function setQty(id: number, raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, '')
    setCart((prev) =>
      prev.map((it) => (it.product_packaging === id ? { ...it, quantity: cleaned } : it))
    )
  }

  function removeItem(id: number) {
    setCart((prev) => prev.filter((it) => it.product_packaging !== id))
    setExpandedCustom((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function setCustomPerKg(id: number, val: string) {
    setCart((prev) =>
      prev.map((it) => (it.product_packaging === id ? { ...it, unit_price_per_kg_idr: val } : it))
    )
  }

  function toggleCustom(id: number) {
    setExpandedCustom((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCreateCustomerFromModal(e: React.FormEvent) {
    e.preventDefault()
    const name = newCustomerName.trim()
    const address = newCustomerAddress.trim()
    if (!name) {
      alert.error('Validasi', 'Nama pelanggan wajib diisi.')
      return
    }
    if (!address) {
      alert.error('Validasi', 'Alamat pelanggan wajib diisi.')
      return
    }
    try {
      const created = await createCustomerMut.mutateAsync({
        name,
        phone: newCustomerPhone.trim() || undefined,
        address,
        wilayah: newCustomerWilayahId === '__none' ? null : Number(newCustomerWilayahId),
        notes: newCustomerNotes.trim() || undefined,
        is_active: true,
      })
      setCustomerId(created.id)
      setCustomerSearch(created.name)
      setCustomerDropdownOpen(false)
      setCustomerModalOpen(false)
      setNewCustomerName('')
      setNewCustomerPhone('')
      setNewCustomerAddress('')
      setNewCustomerNotes('')
      setNewCustomerWilayahId('__none')
      void customersQuery.refetch()
      alert.success('Berhasil', 'Pelanggan baru ditambahkan.')
    } catch (err) {
      alert.error('Gagal menambah pelanggan', parsePurchaseMutationError(err))
    }
  }

  async function handleSubmit() {
    if (customerId === '') {
      alert.error('Validasi', 'Pilih pelanggan terlebih dulu.')
      return
    }
    if (cart.length === 0) {
      alert.error('Validasi', 'Keranjang masih kosong. Pilih produk terlebih dulu.')
      return
    }
    const payloadLines: SalesOrderLineInput[] = []
    for (const it of cart) {
      const qtyNum = Number(it.quantity)
      if (!it.quantity.trim() || !Number.isFinite(qtyNum) || qtyNum <= 0) {
        const pkg = packagingById.get(it.product_packaging)
        alert.error(
          'Validasi',
          `Kuantitas tidak valid untuk ${pkg?.product_variant_name ?? 'produk'} ${pkg?.label ?? ''}.`
        )
        return
      }
      const line: SalesOrderLineInput = {
        product_packaging: it.product_packaging,
        quantity: it.quantity.trim(),
      }
      if (canSetCustomPrice) {
        const priceRaw = it.unit_price_per_kg_idr.trim()
        if (priceRaw) line.unit_price_per_kg_idr = Number(priceRaw)
      }
      payloadLines.push(line)
    }

    const body = lockNotaDetails
      ? { lines: payloadLines }
      : {
          customer: customerId as number,
          invoice_number: invoiceNumber.trim() || undefined,
          invoice_date: invoiceDate || null,
          notes: notes.trim().toUpperCase(),
          lines: payloadLines,
        }

    try {
      if (mode === 'create') {
        const o = await createMut.mutateAsync({
          customer: customerId as number,
          invoice_number: invoiceNumber.trim() || undefined,
          invoice_date: invoiceDate || null,
          notes: notes.trim().toUpperCase(),
          lines: payloadLines,
        })
        alert.success('Berhasil', 'Order penjualan dibuat.')
        onSaved(o.id)
      } else {
        if (!orderId) return
        await updateMut.mutateAsync(body)
        alert.success('Berhasil', 'Order penjualan diperbarui.')
        onSaved(orderId)
      }
    } catch (err) {
      alert.error('Gagal menyimpan', parsePurchaseMutationError(err))
    }
  }

  const selectedCustomer = customers.find((c) => c.id === customerId)

  return (
    <>
      <div className="grid gap-4 pb-24 lg:grid-cols-[1fr_minmax(340px,400px)] lg:items-start lg:pb-0">
        {/* LEFT: product catalog */}
        <Card className="border-outline-variant bg-card">
          <CardHeader className="border-outline-variant space-y-3 border-b pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Katalog produk</CardTitle>
              <span className="text-on-surface-variant text-xs">
                Ketuk produk untuk menambah ke keranjang
              </span>
            </div>
            <div className="relative">
              <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Cari varian, kemasan, atau SKU…"
                className="border-outline-variant pr-3 pl-10"
                disabled={pending}
              />
            </div>
            {variants.length > 0 ? (
              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setVariantFilter('__all')}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1 text-xs font-medium',
                    variantFilter === '__all'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                  )}
                >
                  Semua
                </button>
                {variants.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVariantFilter(v)}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1 text-xs font-medium',
                      variantFilter === v
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="pt-4">
            {packagingQuery.isLoading ? (
              <p className="text-on-surface-variant text-sm">Memuat katalog…</p>
            ) : filteredPackaging.length === 0 ? (
              <p className="text-on-surface-variant py-10 text-center text-sm">
                Tidak ada kemasan yang cocok.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:max-h-[64vh] lg:overflow-y-auto xl:grid-cols-4">
                {filteredPackaging.map((p) => {
                  const inCart = cartQtyById.get(p.id) ?? 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p.id)}
                      disabled={pending}
                      className={cn(
                        'group border-outline-variant bg-surface-container-lowest relative flex flex-col rounded-xl border p-3 text-left transition',
                        'hover:border-primary/60 hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px] focus-visible:outline-none',
                        inCart > 0 && 'border-primary/50 bg-primary/5'
                      )}
                    >
                      {inCart > 0 ? (
                        <Badge className="absolute top-2 right-2 tabular-nums">{inCart}</Badge>
                      ) : null}
                      <span className="text-on-surface-variant truncate text-xs">
                        {p.product_variant_name}
                      </span>
                      <span className="text-on-surface truncate font-medium">{p.label}</span>
                      <span className="text-on-surface-variant text-xs">
                        {PACKAGING_TYPE_LABEL[p.packaging_type] ?? p.packaging_type}
                        {' · '}
                        {fmtKgLabel(p.net_mass_kg)}
                      </span>
                      <span className="text-primary mt-1 font-semibold tabular-nums">
                        {formatIdr(p.total_price_idr)}
                      </span>
                      <span className="text-on-surface-variant mt-0.5 text-[11px]">
                        Stok: {fmtStock(p.remaining_stock)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT: cart / order */}
        <div className="space-y-3 lg:sticky lg:top-4">
          <Card className="border-outline-variant bg-card">
            <CardContent className="space-y-2 p-4">
              <Label htmlFor="so-customer-search" className="text-xs">
                Pelanggan
                <RequiredAsterisk />
              </Label>
              {lockNotaDetails ? (
                <>
                  <div className="border-outline-variant bg-surface-container-low rounded-lg border px-3 py-2 text-sm">
                    {selectedCustomer?.name ??
                      (customerId !== '' ? `#${customerId}` : '—')}
                  </div>
                  {selectedCustomer ? (
                    <p className="text-on-surface-variant truncate text-xs">
                      {[selectedCustomer.wilayah_name, selectedCustomer.phone]
                        .filter(Boolean)
                        .join(' · ') || 'Tanpa detail'}
                    </p>
                  ) : null}
                  <p className="text-on-surface-variant text-[11px]">
                    Detail nota tidak dapat diubah. Anda hanya dapat mengubah item pesanan.
                  </p>
                </>
              ) : (
                <>
              <DropdownMenu open={customerDropdownOpen} onOpenChange={setCustomerDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-outline-variant w-full justify-between font-normal"
                    disabled={pending || customersQuery.isLoading}
                  >
                    <span className="truncate text-left">
                      {selectedCustomer?.name ?? (customerId !== '' ? `#${customerId}` : 'Pilih pelanggan…')}
                    </span>
                    <span className="text-on-surface-variant text-xs">Cari</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  sideOffset={6}
                  className="border-outline-variant bg-surface-container-lowest w-[min(28rem,calc(100vw-2rem))] p-2"
                >
                  <div className="grid gap-2">
                    <Input
                      id="so-customer-search"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Cari pelanggan…"
                      className="border-outline-variant"
                    />
                    <div className="border-outline-variant max-h-56 overflow-auto rounded-md border">
                      {filteredCustomers.length === 0 ? (
                        <div className="text-on-surface-variant p-3 text-sm">
                          Pelanggan tidak ditemukan.
                        </div>
                      ) : (
                        filteredCustomers.map((c) => {
                          const selected = customerId === c.id
                          return (
                            <button
                              key={c.id}
                              type="button"
                              className={cn(
                                'w-full border-b px-3 py-2 text-left text-sm last:border-b-0',
                                selected
                                  ? 'bg-primary/10 border-primary/30 text-primary'
                                  : 'hover:bg-surface-container-low border-outline-variant text-on-surface'
                              )}
                              onClick={() => {
                                setCustomerId(c.id)
                                setCustomerSearch(c.name)
                                setCustomerDropdownOpen(false)
                              }}
                              disabled={pending}
                            >
                              <div className="font-medium">{c.name}</div>
                              <div className="text-on-surface-variant truncate text-xs">
                                {[c.wilayah_name, c.phone || 'Tanpa telepon', c.address || 'Tanpa alamat']
                                  .filter(Boolean)
                                  .join(' · ')}
                              </div>
                            </button>
                          )
                        })
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomerDropdownOpen(false)
                        setCustomerModalOpen(true)
                      }}
                      disabled={pending}
                      className="justify-start"
                    >
                      + Tambah pelanggan baru
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              {selectedCustomer ? (
                <p className="text-on-surface-variant truncate text-xs">
                  {[selectedCustomer.wilayah_name, selectedCustomer.phone]
                    .filter(Boolean)
                    .join(' · ') || 'Tanpa detail'}
                </p>
              ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-outline-variant bg-card">
            <CardHeader className="border-outline-variant flex flex-row items-center justify-between gap-2 border-b pb-3">
              <CardTitle className="text-base">Keranjang</CardTitle>
              <span className="text-on-surface-variant text-xs tabular-nums">
                {totalItems > 0 ? `${totalItems} item · ${totalKgLabel} kg` : 'Kosong'}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <p className="text-on-surface-variant px-4 py-10 text-center text-sm">
                  Belum ada item. Ketuk produk di katalog untuk menambah.
                </p>
              ) : (
                <ul className="divide-outline-variant divide-y">
                  {cart.map((it) => {
                    const pkg = packagingById.get(it.product_packaging)
                    const unit = unitTotalFor(it)
                    const qtyNum = Number(it.quantity) || 0
                    const isCustom = canSetCustomPrice && it.unit_price_per_kg_idr.trim() !== ''
                    const expanded =
                      canSetCustomPrice &&
                      (expandedCustom.has(it.product_packaging) || isCustom)
                    const lineKg = qtyNum * massKgOf(pkg)
                    const pricePerKg = isCustom
                      ? Number(it.unit_price_per_kg_idr) || 0
                      : pkg?.price_per_kg_idr ?? 0
                    return (
                      <li key={it.product_packaging} className="space-y-2 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-on-surface truncate text-sm font-medium">
                              {pkg
                                ? `${pkg.product_variant_name} · ${pkg.label} · ${PACKAGING_TYPE_LABEL[pkg.packaging_type] ?? pkg.packaging_type}`
                                : `#${it.product_packaging}`}
                            </p>
                            <p className="text-on-surface text-xs font-medium tabular-nums">
                              {fmtKg(lineKg)} kg
                            </p>
                            <p className="text-on-surface-variant text-xs tabular-nums">
                              {formatIdr(pricePerKg)} / kg
                              {isCustom ? ' · khusus' : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(it.product_packaging)}
                            disabled={pending}
                            className="text-on-surface-variant hover:text-destructive shrink-0 rounded-md p-1"
                            aria-label="Hapus item"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="border-outline-variant flex items-center rounded-lg border">
                            <button
                              type="button"
                              onClick={() => stepQty(it.product_packaging, -1)}
                              disabled={pending}
                              className="text-on-surface-variant hover:bg-surface-container-low flex size-8 items-center justify-center rounded-l-lg"
                              aria-label="Kurangi"
                            >
                              <Minus className="size-4" />
                            </button>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={it.quantity}
                              onChange={(e) => setQty(it.product_packaging, e.target.value)}
                              disabled={pending}
                              className="w-12 bg-transparent text-center text-sm tabular-nums outline-none"
                              aria-label="Kuantitas"
                            />
                            <button
                              type="button"
                              onClick={() => stepQty(it.product_packaging, 1)}
                              disabled={pending}
                              className="text-on-surface-variant hover:bg-surface-container-low flex size-8 items-center justify-center rounded-r-lg"
                              aria-label="Tambah"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>
                          <span className="text-on-surface text-sm font-semibold tabular-nums">
                            {formatIdr(qtyNum * unit)}
                          </span>
                        </div>
                        {canSetCustomPrice ? (
                          expanded ? (
                            <div className="grid gap-1">
                              <Label className="text-on-surface-variant text-[11px]">
                                Harga khusus per kg (IDR)
                              </Label>
                              <CurrencyInput
                                value={it.unit_price_per_kg_idr}
                                onChange={(v) => setCustomPerKg(it.product_packaging, v)}
                                disabled={pending}
                                placeholder="Auto (harga produk)"
                                className="border-outline-variant h-8"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => toggleCustom(it.product_packaging)}
                              disabled={pending}
                              className="text-primary text-[11px] font-medium"
                            >
                              + Harga khusus
                            </button>
                          )
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-outline-variant bg-card">
            <CardContent className="space-y-3 p-4">
              {lockNotaDetails ? (
                <div className="grid gap-2 text-sm">
                  <div>
                    <p className="text-on-surface-variant text-xs">Nomor faktur</p>
                    <p className="text-on-surface font-medium">{invoiceNumber || '—'}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-xs">Tanggal faktur</p>
                    <p className="text-on-surface font-medium">{invoiceDate || '—'}</p>
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-xs">Catatan</p>
                    <p className="text-on-surface whitespace-pre-wrap">{notes.trim() || '—'}</p>
                  </div>
                </div>
              ) : (
                <>
              <div className="grid gap-1.5">
                <Label htmlFor="so-notes" className="text-xs">
                  Catatan pesanan
                </Label>
                <textarea
                  id="so-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.toUpperCase())}
                  disabled={pending}
                  rows={3}
                  placeholder="Catatan untuk pesanan ini (opsional)…"
                  className={cn(
                    'border-outline-variant bg-field placeholder:text-muted-foreground min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm uppercase outline-none',
                    'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]'
                  )}
                />
              </div>

              <button
                type="button"
                onClick={() => setFakturOpen((v) => !v)}
                className="text-on-surface flex w-full items-center justify-between text-sm font-medium"
              >
                Detail faktur
                <ChevronDown
                  className={cn('size-4 transition', fakturOpen && 'rotate-180')}
                />
              </button>
              {fakturOpen ? (
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="so-inv" className="text-xs">
                      Nomor faktur
                    </Label>
                    <Input
                      id="so-inv"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      disabled={pending}
                      className="border-outline-variant"
                      placeholder="Otomatis dibuat, bisa diubah manual"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="so-inv-date" className="text-xs">
                      Tanggal faktur
                    </Label>
                    <DatePickerInput
                      id="so-inv-date"
                      value={invoiceDate}
                      onChange={setInvoiceDate}
                      disabled={pending}
                    />
                  </div>
                </div>
              ) : null}
                </>
              )}

              <div className="border-outline-variant flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-on-surface-variant">Total berat</span>
                <span className="text-on-surface font-medium tabular-nums">{totalKgLabel} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant text-sm">Total</span>
                <span className="text-on-surface font-heading text-xl font-semibold tabular-nums">
                  {formatIdr(grandTotal)}
                </span>
              </div>

              <div className="hidden gap-2 lg:flex">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={pending}
                  className="flex-1"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={pending || customersQuery.isLoading || packagingQuery.isLoading}
                  className="flex-[2]"
                >
                  {pending ? 'Menyimpan…' : 'Simpan pesanan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile sticky checkout bar */}
      <div className="border-outline-variant bg-card fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t p-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="text-on-surface-variant text-xs">
            {totalItems > 0 ? `${totalItems} item · ${totalKgLabel} kg` : 'Keranjang kosong'}
          </p>
          <p className="text-on-surface font-semibold tabular-nums">{formatIdr(grandTotal)}</p>
        </div>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={pending || customersQuery.isLoading || packagingQuery.isLoading}
          className="shrink-0"
        >
          {pending ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>

      <Dialog open={customerModalOpen} onOpenChange={setCustomerModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah pelanggan baru</DialogTitle>
            <DialogDescription>
              Tambah pelanggan langsung dari form penjualan, lalu pilih otomatis.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleCreateCustomerFromModal}>
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-name">
                Nama pelanggan
                <RequiredAsterisk />
              </Label>
              <Input
                id="quick-customer-name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                disabled={createCustomerMut.isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-phone">Telepon</Label>
              <RegionalPhoneInput
                id="quick-customer-phone"
                value={newCustomerPhone}
                onChange={setNewCustomerPhone}
                disabled={createCustomerMut.isPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-wilayah">Wilayah</Label>
              <Select
                value={newCustomerWilayahId}
                onValueChange={setNewCustomerWilayahId}
                disabled={createCustomerMut.isPending || wilayahQuery.isLoading}
              >
                <SelectTrigger id="quick-customer-wilayah">
                  <SelectValue placeholder="Pilih wilayah" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Tanpa wilayah</SelectItem>
                  {(wilayahQuery.data?.results ?? []).map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-address">
                Alamat
                <RequiredAsterisk />
              </Label>
              <textarea
                id="quick-customer-address"
                value={newCustomerAddress}
                onChange={(e) => setNewCustomerAddress(e.target.value)}
                disabled={createCustomerMut.isPending}
                rows={3}
                className={cn(
                  'border-outline-variant bg-field min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm outline-none',
                  'focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[3px]'
                )}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="quick-customer-notes">Catatan</Label>
              <Input
                id="quick-customer-notes"
                value={newCustomerNotes}
                onChange={(e) => setNewCustomerNotes(e.target.value)}
                disabled={createCustomerMut.isPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomerModalOpen(false)}
                disabled={createCustomerMut.isPending}
              >
                Batal
              </Button>
              <Button type="submit" disabled={createCustomerMut.isPending}>
                {createCustomerMut.isPending ? 'Menyimpan…' : 'Simpan pelanggan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SalesOrderEditGate({
  orderId,
  onCancel,
  onSaved,
}: {
  orderId: number
  onCancel: () => void
  onSaved: (id: number) => void
}) {
  const { data: existing, isLoading } = useSalesOrderQuery(orderId)

  if (isLoading) {
    return <p className="text-on-surface-variant text-sm">Memuat order…</p>
  }

  if (!existing) {
    return <p className="text-destructive text-sm">Order tidak ditemukan.</p>
  }

  if (!canEditOrderLines(existing.status)) {
    return (
      <p className="text-destructive text-sm">
        Order dengan status ini tidak dapat diubah lewat formulir.{' '}
        <PageBackLink
          variant="inline"
          fallback={`/admin/pesanan/penjualan/${orderId}`}
        >
          Kembali ke detail
        </PageBackLink>
      </p>
    )
  }

  return (
    <SalesOrderFormInner
      key={existing.id}
      mode="edit"
      orderId={orderId}
      initial={existing}
      onCancel={onCancel}
      onSaved={onSaved}
    />
  )
}

type Props = {
  mode: 'create' | 'edit'
  orderId?: number
  onCancel: () => void
  onSaved: (id: number) => void
}

export function SalesOrderForm({ mode, orderId, onCancel, onSaved }: Props) {
  if (mode === 'create') {
    return (
      <SalesOrderFormInner mode="create" initial={null} onCancel={onCancel} onSaved={onSaved} />
    )
  }

  if (!orderId) {
    return <p className="text-destructive text-sm">ID order tidak valid.</p>
  }

  return <SalesOrderEditGate orderId={orderId} onCancel={onCancel} onSaved={onSaved} />
}
