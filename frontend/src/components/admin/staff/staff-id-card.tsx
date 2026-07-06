import { APP_BRAND_NAME } from '@/constants/brand'

/** CR80 portrait: standard ID card dimensions rotated vertical. */
export const CARD_WIDTH_MM = 53.98
export const CARD_HEIGHT_MM = 85.6

/** Extra top/bottom inset so text and QR stay clear of laminate edges. */
const CARD_PADDING_X_MM = 4
const CARD_PADDING_TOP_MM = 8.5
const CARD_PADDING_BOTTOM_MM = 8.5

const CARD_FONT_BRAND_PT = 10.5
const CARD_FONT_NAME_PT = 10.5
const CARD_FONT_POSITION_PT = 8.5
const CARD_QR_MAX_MM = 34

const CARD_EXPORT_DPI = 300
const MM_TO_PX = CARD_EXPORT_DPI / 25.4

export const STAFF_ID_CARD_BRAND_NAME = APP_BRAND_NAME

export type StaffIdCardProps = {
  brandName?: string
  fullName: string
  positionLabel: string
  qrDataUrl: string
}

const cardShellStyle = {
  width: `${CARD_WIDTH_MM}mm`,
  height: `${CARD_HEIGHT_MM}mm`,
  padding: `${CARD_PADDING_TOP_MM}mm ${CARD_PADDING_X_MM}mm ${CARD_PADDING_BOTTOM_MM}mm`,
  gap: '2.5mm',
} as const

export function StaffIdCardFace({
  brandName = STAFF_ID_CARD_BRAND_NAME,
  fullName,
  positionLabel,
  qrDataUrl,
}: StaffIdCardProps) {
  return (
    <div
      className="grid box-border overflow-hidden rounded-sm border border-black bg-white text-black shadow-sm"
      style={{
        ...cardShellStyle,
        gridTemplateRows: 'auto 1fr auto',
      }}
    >
      <header className="shrink-0 px-0.5 text-center">
        <p
          className="leading-snug font-bold tracking-wide"
          style={{ fontSize: `${CARD_FONT_BRAND_PT}pt` }}
        >
          {brandName}
        </p>
      </header>

      <div className="flex min-h-0 items-center justify-center overflow-hidden px-0.5">
        <img
          src={qrDataUrl}
          alt=""
          className="object-contain"
          style={{ maxHeight: `${CARD_QR_MAX_MM}mm`, maxWidth: `${CARD_QR_MAX_MM}mm` }}
        />
      </div>

      <footer className="shrink-0 px-0.5 text-center">
        <p className="leading-snug font-bold" style={{ fontSize: `${CARD_FONT_NAME_PT}pt` }}>
          {fullName}
        </p>
        <p
          className="mt-1 leading-snug text-black/75"
          style={{ fontSize: `${CARD_FONT_POSITION_PT}pt` }}
        >
          {positionLabel}
        </p>
      </footer>
    </div>
  )
}

export function StaffIdCardPreview(props: StaffIdCardProps) {
  return (
    <div className="bg-surface-container-low rounded-xl border p-8">
      <div className="mx-auto w-fit">
        <StaffIdCardFace {...props} />
      </div>
    </div>
  )
}

function ptToPx(pt: number) {
  return (pt * CARD_EXPORT_DPI) / 72
}

function mmToPx(mm: number) {
  return mm * MM_TO_PX
}

function safeJpgFilename(fullName: string): string {
  const slug = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  return `kartu-staf-${slug || 'staf'}.jpg`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal memuat gambar QR'))
    img.src = src
  })
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/)
  if (words.length === 0) return []

  const lines: string[] = []
  let current = words[0] ?? ''

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
    } else {
      lines.push(current)
      current = words[i] ?? ''
    }
  }
  lines.push(current)
  return lines
}

function drawCenteredLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centerX: number,
  startY: number,
  lineHeight: number
) {
  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + index * lineHeight)
  })
}

export async function downloadStaffIdCardJpg({
  brandName = STAFF_ID_CARD_BRAND_NAME,
  fullName,
  positionLabel,
  qrDataUrl,
}: StaffIdCardProps): Promise<boolean> {
  try {
    const widthPx = Math.round(CARD_WIDTH_MM * MM_TO_PX)
    const heightPx = Math.round(CARD_HEIGHT_MM * MM_TO_PX)
    const paddingXPx = mmToPx(CARD_PADDING_X_MM)
    const paddingTopPx = mmToPx(CARD_PADDING_TOP_MM)
    const paddingBottomPx = mmToPx(CARD_PADDING_BOTTOM_MM)
    const innerWidth = widthPx - paddingXPx * 2
    const centerX = widthPx / 2

    const canvas = document.createElement('canvas')
    canvas.width = widthPx
    canvas.height = heightPx
    const ctx = canvas.getContext('2d')
    if (!ctx) return false

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, widthPx, heightPx)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = Math.max(1, MM_TO_PX * 0.2)
    ctx.strokeRect(
      ctx.lineWidth / 2,
      ctx.lineWidth / 2,
      widthPx - ctx.lineWidth,
      heightPx - ctx.lineWidth
    )

    const brandFontSize = ptToPx(CARD_FONT_BRAND_PT)
    ctx.fillStyle = '#000000'
    ctx.font = `bold ${brandFontSize}px Helvetica, Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const brandLines = wrapTextLines(ctx, brandName, innerWidth)
    const brandLineHeight = brandFontSize * 1.2
    drawCenteredLines(ctx, brandLines, centerX, paddingTopPx, brandLineHeight)

    const nameFontSize = ptToPx(CARD_FONT_NAME_PT)
    const positionFontSize = ptToPx(CARD_FONT_POSITION_PT)
    const nameLineHeight = nameFontSize * 1.2
    const positionLineHeight = positionFontSize * 1.2
    const positionGapPx = mmToPx(1)

    ctx.font = `bold ${nameFontSize}px Helvetica, Arial, sans-serif`
    const nameLines = wrapTextLines(ctx, fullName, innerWidth)
    ctx.font = `${positionFontSize}px Helvetica, Arial, sans-serif`
    const positionLines = wrapTextLines(ctx, positionLabel, innerWidth)
    const footerHeight =
      nameLines.length * nameLineHeight +
      (positionLines.length > 0
        ? positionGapPx + positionLines.length * positionLineHeight
        : 0)

    const brandBlockPx = brandLines.length * brandLineHeight + mmToPx(2)
    const contentHeight = heightPx - paddingTopPx - paddingBottomPx
    const middleHeight = contentHeight - brandBlockPx - footerHeight
    const qrSize = Math.min(mmToPx(CARD_QR_MAX_MM), innerWidth, middleHeight)

    const qrImage = await loadImage(qrDataUrl)
    const qrX = (widthPx - qrSize) / 2
    const qrY = paddingTopPx + brandBlockPx + Math.max(0, (middleHeight - qrSize) / 2)
    ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)

    const nameStartY = heightPx - paddingBottomPx - footerHeight

    ctx.font = `bold ${nameFontSize}px Helvetica, Arial, sans-serif`
    ctx.fillStyle = '#000000'
    drawCenteredLines(ctx, nameLines, centerX, nameStartY, nameLineHeight)

    ctx.font = `${positionFontSize}px Helvetica, Arial, sans-serif`
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    drawCenteredLines(
      ctx,
      positionLines,
      centerX,
      nameStartY + nameLines.length * nameLineHeight + positionGapPx,
      positionLineHeight
    )

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95)
    })
    if (!blob) return false

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = safeJpgFilename(fullName)
    anchor.click()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}
