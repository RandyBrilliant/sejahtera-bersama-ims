import { useCallback, useEffect, useState } from 'react'

import { fetchIngredients } from '@/api/inventory'
import { createKupasItem, fetchKupasItems, patchKupasItem } from '@/api/payroll'
import { PageBackLink } from '@/components/navigation/page-back-link'
import { Button } from '@/components/ui/button'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { alert } from '@/lib/alert'
import { idrToDigits } from '@/lib/format-idr'
import type { Ingredient } from '@/types/inventory'
import type { KupasItem } from '@/types/payroll'
import { isAxiosError } from 'axios'

function axiosDetail(err: unknown): string | undefined {
  if (!isAxiosError(err)) return undefined
  const d = err.response?.data as { detail?: unknown } | undefined
  return typeof d?.detail === 'string' ? d.detail : undefined
}

const LIST_PATH = '/admin/gaji'

export function AdminPayrollKupasItemsPage() {
  const [items, setItems] = useState<KupasItem[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<number | 'new' | null>(null)
  const [draftRates, setDraftRates] = useState<Record<number, string>>({})
  const [newName, setNewName] = useState('')
  const [newRate, setNewRate] = useState('')
  const [newIngredientId, setNewIngredientId] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [list, ing] = await Promise.all([
        fetchKupasItems(false),
        fetchIngredients({ page: 1, page_size: 200, is_active: true }),
      ])
      setItems(list)
      setIngredients(ing.results)
      const rates: Record<number, string> = {}
      for (const item of list) rates[item.id] = idrToDigits(item.rate_per_kg_idr)
      setDraftRates(rates)
    } catch (e) {
      alert.error('Jenis kupas', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function saveRate(item: KupasItem) {
    const raw = draftRates[item.id]?.trim()
    if (!raw) {
      alert.error('Validasi', 'Isi tarif per kg.')
      return
    }
    setSavingId(item.id)
    try {
      const updated = await patchKupasItem(item.id, { rate_per_kg_idr: raw })
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      setDraftRates((d) => ({ ...d, [item.id]: idrToDigits(updated.rate_per_kg_idr) }))
      alert.success('Tarif diperbarui.')
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setSavingId(null)
    }
  }

  async function toggleActive(item: KupasItem) {
    setSavingId(item.id)
    try {
      const updated = await patchKupasItem(item.id, { is_active: !item.is_active })
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setSavingId(null)
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newRate.trim()) {
      alert.error('Validasi', 'Nama dan tarif per kg wajib diisi.')
      return
    }
    setSavingId('new')
    try {
      const created = await createKupasItem({
        name: newName.trim(),
        rate_per_kg_idr: newRate.trim(),
        resulting_ingredient: newIngredientId ? Number(newIngredientId) : null,
      })
      setItems((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setDraftRates((d) => ({ ...d, [created.id]: idrToDigits(created.rate_per_kg_idr) }))
      setNewName('')
      setNewRate('')
      setNewIngredientId('')
      alert.success('Jenis kupas ditambahkan.')
    } catch (e) {
      alert.error('Gagal', axiosDetail(e) ?? String((e as Error)?.message ?? e))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <PageBackLink fallback={LIST_PATH}>← Kembali ke periode payroll</PageBackLink>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          Jenis kupas & tarif per kg
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">
          Setiap jenis barang kupas memiliki tarif tetap per kg (sama untuk semua pekerja). Variasi
          bawang masuk dapat dihubungkan ke bahan hasil di inventori.
        </p>
      </div>

      <section className="border-outline-variant space-y-4 rounded-xl border p-6">
        <h2 className="text-on-surface text-sm font-semibold tracking-wide uppercase">Tambah jenis</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="ki-name">Nama jenis</Label>
            <Input
              id="ki-name"
              forceUppercase={false}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={savingId === 'new'}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ki-rate">Tarif per kg (IDR)</Label>
            <CurrencyInput
              id="ki-rate"
              placeholder="Mis. 2.500"
              value={newRate}
              onChange={setNewRate}
              disabled={savingId === 'new'}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ki-ing">Bahan hasil (opsional)</Label>
            <select
              id="ki-ing"
              className="border-input bg-field h-10 w-full rounded-lg border px-2 text-sm"
              value={newIngredientId}
              onChange={(e) => setNewIngredientId(e.target.value)}
              disabled={savingId === 'new'}
            >
              <option value="">— Tidak dihubungkan —</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="button" disabled={savingId === 'new'} onClick={() => void handleCreate()}>
              {savingId === 'new' ? 'Menyimpan…' : 'Tambah'}
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="text-on-surface-variant text-sm">Memuat…</p>
      ) : (
        <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Bahan hasil</TableHead>
                <TableHead>Tarif / kg</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className={!item.is_active ? 'opacity-60' : undefined}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-sm">{item.resulting_ingredient_name ?? '—'}</TableCell>
                  <TableCell>
                    <CurrencyInput
                      className="h-9 min-w-[8rem]"
                      value={draftRates[item.id] ?? ''}
                      onChange={(rate) =>
                        setDraftRates((d) => ({ ...d, [item.id]: rate }))
                      }
                      disabled={savingId === item.id}
                    />
                  </TableCell>
                  <TableCell>{item.is_active ? 'Aktif' : 'Nonaktif'}</TableCell>
                  <TableCell className="space-x-2 text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={savingId === item.id}
                      onClick={() => void saveRate(item)}
                    >
                      Simpan tarif
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={savingId === item.id}
                      onClick={() => void toggleActive(item)}
                    >
                      {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && items.length === 0 ? (
        <p className="text-on-surface-variant text-sm">Belum ada jenis kupas.</p>
      ) : null}
    </div>
  )
}
