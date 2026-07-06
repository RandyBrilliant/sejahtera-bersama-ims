function safePdfFilename(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
  return base || 'slip-gaji'
}

export function payrollSlipPdfFilename(employeeName: string, payDate: string): string {
  return `${safePdfFilename(employeeName)}-${payDate}-slip-gaji.pdf`
}

function forceWhiteBackground(root: HTMLElement): void {
  const nodes: Element[] = [root, ...root.querySelectorAll('*')]
  for (const node of nodes) {
    if (node instanceof HTMLElement) {
      node.style.backgroundColor = '#ffffff'
    }
  }
}

/** Render slip element to A4 PDF and trigger download. */
export async function downloadPayrollSlipPdf(
  element: HTMLElement,
  filename: string
): Promise<boolean> {
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      onclone: (_doc, clonedElement) => {
        forceWhiteBackground(clonedElement)
      },
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 12
    const maxWidth = pageWidth - margin * 2
    const maxHeight = pageHeight - margin * 2

    const imgWidth = maxWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const imgData = canvas.toDataURL('image/png', 1.0)

    if (imgHeight <= maxHeight) {
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight)
    } else {
      const scale = maxHeight / imgHeight
      const w = imgWidth * scale
      const h = imgHeight * scale
      const x = (pageWidth - w) / 2
      pdf.addImage(imgData, 'PNG', x, margin, w, h)
    }

    pdf.save(filename)
    return true
  } catch {
    return false
  }
}
