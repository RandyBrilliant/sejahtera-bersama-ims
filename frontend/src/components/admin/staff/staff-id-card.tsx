import { APP_BRAND_NAME } from '@/constants/brand'

/** CR80 portrait: standard ID card dimensions rotated vertical. */
export const CARD_WIDTH_MM = 53.98
export const CARD_HEIGHT_MM = 85.6
const CARD_PADDING_MM = 4

export type StaffIdCardProps = {
  brandName?: string
  fullName: string
  positionLabel: string
  qrDataUrl: string
}

const cardShellStyle = {
  width: `${CARD_WIDTH_MM}mm`,
  height: `${CARD_HEIGHT_MM}mm`,
  padding: `${CARD_PADDING_MM}mm`,
  gap: '2mm',
} as const

export function StaffIdCardFace({
  brandName = APP_BRAND_NAME,
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
        <p className="text-[8.5pt] leading-snug font-bold tracking-wide">{brandName}</p>
      </header>

      <div className="flex min-h-0 items-center justify-center overflow-hidden px-0.5">
        <img
          src={qrDataUrl}
          alt=""
          className="max-h-[38mm] max-w-[38mm] object-contain"
        />
      </div>

      <footer className="shrink-0 px-0.5 text-center">
        <p className="text-[8pt] leading-snug font-bold">{fullName}</p>
        <p className="mt-0.5 text-[6.5pt] leading-snug text-black/75">{positionLabel}</p>
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

function safePdfFilename(fullName: string): string {
  const slug = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  return `kartu-staf-${slug || 'staf'}.pdf`
}

export async function downloadStaffIdCardPdf({
  brandName = APP_BRAND_NAME,
  fullName,
  positionLabel,
  qrDataUrl,
}: StaffIdCardProps): Promise<boolean> {
  try {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
      compress: true,
    })

    const innerWidth = CARD_WIDTH_MM - CARD_PADDING_MM * 2
    const centerX = CARD_WIDTH_MM / 2

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(0, 0, 0)
    doc.text(brandName, centerX, CARD_PADDING_MM + 3.5, {
      align: 'center',
      maxWidth: innerWidth,
    })

    const qrSize = Math.min(38, innerWidth)
    const qrX = (CARD_WIDTH_MM - qrSize) / 2
    const brandBlockMm = 9
    const footerBlockMm = 14
    const middleHeight =
      CARD_HEIGHT_MM - CARD_PADDING_MM * 2 - brandBlockMm - footerBlockMm
    const qrY = CARD_PADDING_MM + brandBlockMm + Math.max(0, (middleHeight - qrSize) / 2)
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

    const nameY = CARD_HEIGHT_MM - CARD_PADDING_MM - 5.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(fullName, centerX, nameY, { align: 'center', maxWidth: innerWidth })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(80, 80, 80)
    doc.text(positionLabel, centerX, nameY + 3.5, { align: 'center', maxWidth: innerWidth })

    doc.save(safePdfFilename(fullName))
    return true
  } catch {
    return false
  }
}
