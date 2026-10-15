/**
 * Dashboard chart palette (validated: lightness band, chroma floor, CVD +
 * normal-vision separation and ≥3:1 contrast on white). Series 1 is a
 * brand-adjacent violet, series 2 an orange that reads as its opposite.
 */
export const CHART = {
  series1: '#5b4bd5',
  series2: '#eb6834',
  grid: '#ecebf2',
  axis: '#8a8797',
  surface: '#ffffff',
} as const

const COMPACT = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
})

/** 1.250.000 → "1,3 jt" — for axis ticks and secondary figures. */
export function compactIdr(n: number): string {
  return COMPACT.format(n)
}
