import { useState } from 'react'

import { ENTRY_KIND_LABEL } from '@/constants/expenses'
import {
  useCreateOperationalCategoryMutation,
  useUpdateOperationalCategoryMutation,
} from '@/hooks/use-expenses-query'
import { alert } from '@/lib/alert'
import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { EntryKind, OperationalCategory } from '@/types/expenses'

type Props = {
  mode: 'create' | 'edit'
  initial: OperationalCategory | null
  onCancel: () => void
  onSaved: () => void
}

export function OperationalCategoryForm({ mode, initial, onCancel, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [entryKind, setEntryKind] = useState<EntryKind>(initial?.entry_kind ?? 'EXPENSE')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0))
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  const createMutation = useCreateOperationalCategoryMutation()
  const updateMutation = useUpdateOperationalCategoryMutation(initial?.id ?? 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) {
      alert.error('Validasi', 'Nama kategori wajib diisi.')
      return
    }
    const so = Number.parseInt(sortOrder, 10)
    const sort = Number.isFinite(so) ? so : 0

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: n,
          entry_kind: entryKind,
          description: description.trim() || undefined,
          sort_order: sort,
          is_active: isActive,
        })
        alert.success('Berhasil', 'Kategori ditambahkan.')
      } else {
        if (!initial) return
        await updateMutation.mutateAsync({
          name: n,
          entry_kind: entryKind,
          description: description.trim() || undefined,
          sort_order: sort,
          is_active: isActive,
        })
        alert.success('Berhasil', 'Kategori diperbarui.')
      }
      onSaved()
    } catch (err) {
      alert.error('Gagal menyimpan', parsePurchaseMutationError(err))
    }
  }

  const submitting = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-outline-variant bg-card">
        <CardHeader className="border-outline-variant border-b pb-4">
          <CardTitle className="text-base">
            {mode === 'create' ? 'Kategori baru' : 'Data kategori'}
          </CardTitle>
          <CardDescription>
            Satu kategori hanya untuk pemasukan atau pengeluaran. Slug dibuat otomatis dari nama.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cat-name">Nama</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                className="border-outline-variant"
              />
            </div>
            <div className="grid gap-2">
              <Label>Jenis</Label>
              <Select
                value={entryKind}
                onValueChange={(v) => setEntryKind(v as EntryKind)}
                disabled={submitting}
              >
                <SelectTrigger className="border-outline-variant w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ENTRY_KIND_LABEL) as EntryKind[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {ENTRY_KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-sort">Urutan</Label>
              <Input
                id="cat-sort"
                inputMode="numeric"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={submitting}
                className="border-outline-variant"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="cat-desc">Deskripsi</Label>
              <textarea
                id="cat-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                rows={3}
                className="border-outline-variant bg-background focus-visible:ring-ring placeholder:text-muted-foreground flex min-h-[72px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {mode === 'edit' && initial ? (
              <div className="text-on-surface-variant md:col-span-2 text-sm">
                Slug: <code className="bg-surface-container-low rounded px-1">{initial.slug}</code>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="cat-active"
              checked={isActive}
              onCheckedChange={(v) => setIsActive(v === true)}
              disabled={submitting}
            />
            <Label htmlFor="cat-active" className="font-normal">
              Aktif
            </Label>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={submitting} className="ambient-shadow">
              {submitting ? 'Menyimpan…' : 'Simpan'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Batal
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
