import type { PackagingType } from '@/types/inventory'

export const PACKAGING_TYPE_LABEL: Record<PackagingType, string> = {
  BAL: 'Bal (BAL)',
  KTK: 'Kotak (KTK)',
}

export const PACKAGING_TYPES: readonly PackagingType[] = ['BAL', 'KTK']
