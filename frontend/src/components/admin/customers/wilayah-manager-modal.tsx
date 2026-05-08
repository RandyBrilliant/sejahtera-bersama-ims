import { useMemo, useState } from 'react'

import { parsePurchaseMutationError } from '@/components/admin/orders/purchase-mutation-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { alert } from '@/lib/alert'
import {
  useCreateWilayahMutation,
  useDeleteWilayahMutation,
  useUpdateWilayahMutation,
  useWilayahQuery,
} from '@/hooks/use-purchase-query'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WilayahManagerModal({ open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const wilayahQuery = useWilayahQuery({ page: 1, page_size: 200, ordering: 'name' })
  const createMutation = useCreateWilayahMutation()
  const deleteMutation = useDeleteWilayahMutation()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const updateMutation = useUpdateWilayahMutation(editingId ?? 0)

  const rows = useMemo(() => wilayahQuery.data?.results ?? [], [wilayahQuery.data?.results])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) {
      alert.error('Validasi', 'Nama wilayah wajib diisi.')
      return
    }
    const alreadyExists = rows.some((w) => w.name.toLowerCase() === clean.toLowerCase())
    if (alreadyExists) {
      alert.error('Validasi', 'Nama wilayah sudah ada.')
      return
    }
    try {
      await createMutation.mutateAsync({ name: clean, is_active: true })
      setName('')
      alert.success('Berhasil', 'Wilayah ditambahkan.')
    } catch (err) {
      alert.error('Gagal', parsePurchaseMutationError(err))
    }
  }

  async function handleDelete(id: number, wilayahName: string) {
    const ok =
      typeof window !== 'undefined' ? window.confirm(`Hapus wilayah "${wilayahName}"?`) : false
    if (!ok) return
    try {
      await deleteMutation.mutateAsync(id)
      alert.success('Berhasil', 'Wilayah dihapus.')
    } catch (err) {
      alert.error('Gagal', parsePurchaseMutationError(err))
    }
  }

  async function handleSaveEdit() {
    if (editingId == null) return
    const clean = editingName.trim()
    if (!clean) {
      alert.error('Validasi', 'Nama wilayah wajib diisi.')
      return
    }
    const alreadyExists = rows.some(
      (w) => w.id !== editingId && w.name.toLowerCase() === clean.toLowerCase()
    )
    if (alreadyExists) {
      alert.error('Validasi', 'Nama wilayah sudah ada.')
      return
    }
    try {
      await updateMutation.mutateAsync({ name: clean })
      alert.success('Berhasil', 'Wilayah diperbarui.')
      setEditingId(null)
      setEditingName('')
    } catch (err) {
      alert.error('Gagal', parsePurchaseMutationError(err))
    }
  }

  const isPending = createMutation.isPending || deleteMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-outline-variant bg-card sm:max-w-xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Kelola wilayah</DialogTitle>
          <DialogDescription>
            Tambah wilayah baru (contoh: ACEH, MEDAN, KISARAN). Wilayah dapat dipilih saat membuat atau
            mengedit pelanggan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama wilayah"
            disabled={isPending}
          />
          <Button type="submit" disabled={isPending}>
            Tambah
          </Button>
        </form>

        <div className="border-outline-variant max-h-64 overflow-auto rounded-lg border">
          {wilayahQuery.isLoading ? (
            <p className="text-on-surface-variant p-3 text-sm">Memuat wilayah…</p>
          ) : rows.length === 0 ? (
            <p className="text-on-surface-variant p-3 text-sm">Belum ada wilayah.</p>
          ) : (
            <ul className="divide-outline-variant divide-y">
              {rows.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    {editingId === w.id ? (
                      <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} disabled={isPending} />
                    ) : (
                      <span className="text-sm font-medium">{w.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === w.id ? (
                      <>
                        <Button type="button" size="sm" disabled={isPending} onClick={() => void handleSaveEdit()}>
                          Simpan
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => {
                            setEditingId(null)
                            setEditingName('')
                          }}
                        >
                          Batal
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => {
                            setEditingId(w.id)
                            setEditingName(w.name)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-destructive text-destructive hover:bg-destructive/10"
                          disabled={isPending}
                          onClick={() => void handleDelete(w.id, w.name)}
                        >
                          Hapus
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
