"""Generate the 'Bon / Faktur' sales receipt for UD. Sejahtera Bersama.

The physical receipt (pre-printed pad) is 15 cm wide x 10.5 cm tall and is
printed on an Epson LQ dot-matrix printer. Two output modes are supported:

- ``preprinted`` — draws *only the values* (date, buyer, item rows, totals),
  positioned to fall exactly on top of the pre-printed pad so the existing
  stock can be used up first.
- ``full`` — draws the whole layout (header, contact info, table grid,
  labels *and* values) on blank paper, for when the pre-printed pads run out.

All coordinates live in :class:`ReceiptLayout` (millimetres, measured from the
top-left corner) so the layout can be calibrated to the exact pad without
touching the drawing code. ReportLab's canvas uses a bottom-left origin, so
:meth:`ReceiptLayout.y` converts a top-based millimetre value to canvas units.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from io import BytesIO

from reportlab.lib.colors import Color, black, red
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

# Fixed page geometry for the pad.
PAGE_WIDTH_MM = 150.0
PAGE_HEIGHT_MM = 105.0
PAGE_SIZE = (PAGE_WIDTH_MM * mm, PAGE_HEIGHT_MM * mm)

COMPANY_NAME = "UD. SEJAHTERA BERSAMA"
COMPANY_BRAND = "CAP NYONYA MERAH"
COMPANY_CONTACT = (
    "WA : 0878 4438 7118 - 0821 6374 6399",
    "HP. 0821 6374 6399",
)
RETURN_NOTICE = (
    "Barang² yang sudah dibeli",
    "tidak dapat dikembalikan/ditukar",
)

FONT = "Helvetica"
FONT_BOLD = "Helvetica-Bold"


@dataclass(frozen=True)
class Column:
    """Horizontal bounds (mm, from left) of one table column."""

    left: float
    right: float

    @property
    def center(self) -> float:
        return (self.left + self.right) / 2.0


@dataclass(frozen=True)
class ReceiptLayout:
    """All tunable coordinates, in millimetres measured from the top-left."""

    margin_left: float = 8.0
    margin_right: float = 8.0

    # Header block (company identity, top-left).
    company_name_top: float = 8.0
    brand_top: float = 13.0
    contact_top: float = 17.5
    contact_line_height: float = 3.2

    # Meta block (top-right): tanggal + kepada yth.
    date_label_top: float = 8.5
    date_value_top: float = 8.0
    date_line_left: float = 92.0
    date_line_right: float = 128.0
    date_label_x: float = 131.0

    kepada_label_top: float = 14.0
    kepada_label_x: float = 90.0
    kepada_value_x: float = 118.0
    kepada_cont_x: float = 92.0
    kepada_line_tops: tuple[float, ...] = (13.5, 18.8, 24.1)

    # Bon / Faktur number.
    faktur_label_top: float = 27.5
    faktur_value_top: float = 27.5
    faktur_value_x: float = 46.0

    # Table.
    table_top: float = 31.0
    header_bottom: float = 37.0
    table_bottom: float = 90.0
    first_row_baseline_top: float = 42.0
    row_height: float = 7.0
    row_count: int = 7

    col_qty: Column = field(default_factory=lambda: Column(8.0, 33.0))
    col_name: Column = field(default_factory=lambda: Column(33.0, 99.0))
    col_unit: Column = field(default_factory=lambda: Column(99.0, 121.0))
    col_total: Column = field(default_factory=lambda: Column(121.0, 142.0))

    cell_padding: float = 1.8

    # Footer.
    tanda_terima_top: float = 96.0
    notice_center_x: float = 66.0
    notice_top: float = 93.5
    notice_line_height: float = 3.0
    total_label_top: float = 96.0
    total_label_x: float = 104.0
    total_currency_x: float = 121.0
    total_value_top: float = 96.0

    def y(self, top_mm: float) -> float:
        """Convert a top-based millimetre value to canvas (bottom-left) units."""
        return (PAGE_HEIGHT_MM - top_mm) * mm

    @property
    def columns(self) -> tuple[Column, ...]:
        return (self.col_qty, self.col_name, self.col_unit, self.col_total)


DEFAULT_LAYOUT = ReceiptLayout()


def _format_thousands(value: int) -> str:
    """Indonesian thousands grouping: 1250000 -> '1.250.000'."""
    return f"{int(value):,}".replace(",", ".")


def _format_quantity(quantity: Decimal) -> str:
    """Trim trailing zeros: Decimal('10.000') -> '10', Decimal('2.500') -> '2.5'."""
    normalized = Decimal(str(quantity)).normalize()
    text = format(normalized, "f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text or "0"


def _packaging_display(packaging) -> str:
    """Human label for a packaging line, e.g. 'Original — 250 gram'."""
    product = packaging.product if packaging.product_id else None
    variant = (product.variant_name if product else "").strip()
    label = (packaging.label or "").strip()
    if variant and label:
        return f"{variant} — {label}"
    return variant or label or "-"


def _fit_text(pdf: canvas.Canvas, text: str, font: str, size: float, max_width: float) -> str:
    """Truncate ``text`` (adding an ellipsis) so it fits within ``max_width`` mm."""
    limit = max_width * mm
    if pdf.stringWidth(text, font, size) <= limit:
        return text
    ellipsis = "…"
    trimmed = text
    while trimmed and pdf.stringWidth(trimmed + ellipsis, font, size) > limit:
        trimmed = trimmed[:-1]
    return (trimmed + ellipsis) if trimmed else ""


def _receipt_date(order) -> str:
    value = order.invoice_date
    if value is None and order.created_at is not None:
        value = order.created_at.date()
    return value.strftime("%d-%m-%Y") if value else ""


def _address_lines(customer, max_lines: int) -> list[str]:
    address = (customer.address or "").strip()
    if not address:
        return []
    parts = [seg.strip() for seg in address.replace("\r", "").split("\n") if seg.strip()]
    return parts[:max_lines]


def _draw_template(pdf: canvas.Canvas, layout: ReceiptLayout) -> None:
    """Draw the static parts of the form (header, labels, grid)."""
    left = layout.margin_left

    pdf.setFillColor(black)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(left * mm, layout.y(layout.company_name_top), COMPANY_NAME)
    pdf.setFont(FONT_BOLD, 10)
    pdf.drawString((left + 8) * mm, layout.y(layout.brand_top), COMPANY_BRAND)
    pdf.setFont(FONT, 6.5)
    for index, line in enumerate(COMPANY_CONTACT):
        top = layout.contact_top + index * layout.contact_line_height
        pdf.drawString((left + 6) * mm, layout.y(top), line)

    # Meta labels (tanggal + kepada yth.) with their fill-in rules.
    pdf.setLineWidth(0.4)
    pdf.line(
        layout.date_line_left * mm,
        layout.y(layout.date_label_top + 0.8),
        layout.date_line_right * mm,
        layout.y(layout.date_label_top + 0.8),
    )
    pdf.setFont(FONT, 8)
    pdf.drawString(layout.date_label_x * mm, layout.y(layout.date_label_top), "tgl.")
    pdf.setFont(FONT_BOLD, 8)
    pdf.drawString(layout.kepada_label_x * mm, layout.y(layout.kepada_label_top), "KEPADA YTH. :")
    pdf.setLineWidth(0.4)
    right_edge = (PAGE_WIDTH_MM - layout.margin_right) * mm
    for index, top in enumerate(layout.kepada_line_tops):
        line_start = layout.kepada_value_x if index == 0 else layout.kepada_cont_x
        pdf.line(line_start * mm, layout.y(top + 0.8), right_edge, layout.y(top + 0.8))

    # Bon / Faktur label.
    pdf.setFont(FONT_BOLD, 8)
    pdf.drawString(left * mm, layout.y(layout.faktur_label_top), "BON / FAKTUR No.")

    # Table outline + column separators.
    right = PAGE_WIDTH_MM - layout.margin_right
    top_y = layout.y(layout.table_top)
    bottom_y = layout.y(layout.table_bottom)
    pdf.setLineWidth(0.6)
    pdf.rect(left * mm, bottom_y, (right - left) * mm, (top_y - bottom_y), stroke=1, fill=0)
    pdf.setLineWidth(0.4)
    pdf.line(left * mm, layout.y(layout.header_bottom), right * mm, layout.y(layout.header_bottom))
    for column in layout.columns[:-1]:
        pdf.line(column.right * mm, top_y, column.right * mm, bottom_y)

    # Column headers.
    header_baseline = layout.y((layout.table_top + layout.header_bottom) / 2 + 1.2)
    pdf.setFont(FONT_BOLD, 7.5)
    pdf.drawCentredString(layout.col_qty.center * mm, header_baseline, "Banyaknya")
    pdf.drawCentredString(layout.col_name.center * mm, header_baseline, "NAMA BARANG")
    pdf.drawCentredString(layout.col_unit.center * mm, header_baseline, "@ Rp")
    pdf.drawCentredString(layout.col_total.center * mm, header_baseline, "Jumlah Harga")

    # Footer labels.
    pdf.setFont(FONT, 7.5)
    pdf.drawString(left * mm, layout.y(layout.tanda_terima_top), "TANDA TERIMA")
    pdf.setFont(FONT, 5.5)
    for index, line in enumerate(RETURN_NOTICE):
        top = layout.notice_top + index * layout.notice_line_height
        pdf.drawCentredString(layout.notice_center_x * mm, layout.y(top), line)
    pdf.setFont(FONT_BOLD, 8)
    pdf.drawString(layout.total_label_x * mm, layout.y(layout.total_label_top), "Jumlah")
    pdf.drawString(layout.total_currency_x * mm, layout.y(layout.total_label_top), "Rp.")


def _draw_values(
    pdf: canvas.Canvas,
    layout: ReceiptLayout,
    order,
    lines,
    *,
    include_faktur_number: bool,
) -> None:
    """Draw the dynamic values.

    ``include_faktur_number`` is only ``True`` in ``full`` mode; on the physical
    pad the faktur number is already pre-printed in red, so the overlay must not
    print over it.
    """
    # Date.
    pdf.setFillColor(black)
    pdf.setFont(FONT_BOLD, 8.5)
    date_text = _receipt_date(order)
    if date_text:
        pdf.drawCentredString(
            (layout.date_line_left + layout.date_line_right) / 2 * mm,
            layout.y(layout.date_value_top),
            date_text,
        )

    # Kepada Yth. — buyer name on the first line (after the label), then address.
    pdf.setFont(FONT, 8)
    buyer_entries: list[tuple[str, float]] = []
    if order.customer_id:
        buyer_entries.append((order.customer.name.strip(), layout.kepada_value_x))
    max_address = len(layout.kepada_line_tops) - len(buyer_entries)
    buyer_entries += [(line, layout.kepada_cont_x) for line in _address_lines(order.customer, max_address)]
    for (text, x_mm), top in zip(buyer_entries, layout.kepada_line_tops):
        width = PAGE_WIDTH_MM - layout.margin_right - x_mm
        pdf.drawString(x_mm * mm, layout.y(top), _fit_text(pdf, text, FONT, 8, width))

    # Bon / Faktur number (already pre-printed in red on the pad).
    if include_faktur_number:
        faktur = (order.invoice_number or order.order_code or "").strip()
        if faktur:
            pdf.setFillColor(red)
            pdf.setFont(FONT_BOLD, 11)
            pdf.drawString(layout.faktur_value_x * mm, layout.y(layout.faktur_value_top), faktur)
            pdf.setFillColor(black)

    # Item rows.
    pdf.setFont(FONT, 8)
    name_width = (layout.col_name.right - layout.col_name.left) - 2 * layout.cell_padding
    for index, line in enumerate(lines):
        baseline = layout.y(layout.first_row_baseline_top + index * layout.row_height)
        pdf.drawCentredString(
            layout.col_qty.center * mm,
            baseline,
            _format_quantity(line.quantity),
        )
        pdf.drawString(
            (layout.col_name.left + layout.cell_padding) * mm,
            baseline,
            _fit_text(pdf, _packaging_display(line.product_packaging), FONT, 8, name_width),
        )
        pdf.drawRightString(
            (layout.col_unit.right - layout.cell_padding) * mm,
            baseline,
            _format_thousands(int(line.unit_price_idr)),
        )
        pdf.drawRightString(
            (layout.col_total.right - layout.cell_padding) * mm,
            baseline,
            _format_thousands(int(line.line_total_idr)),
        )

    # Grand total.
    pdf.setFont(FONT_BOLD, 9)
    pdf.drawRightString(
        (layout.col_total.right - layout.cell_padding) * mm,
        layout.y(layout.total_value_top),
        _format_thousands(int(order.total_idr)),
    )


def build_sales_order_receipt_pdf(
    order,
    *,
    mode: str = "preprinted",
    layout: ReceiptLayout | None = None,
) -> BytesIO:
    """Build the 15x10.5 cm sales receipt PDF for ``order``.

    Args:
        order: A ``SalesOrder`` with ``customer`` and ``lines`` prefetched.
        mode: ``"preprinted"`` draws values only (overlay on existing pads);
            ``"full"`` draws the complete form on blank paper.
        layout: Optional layout override for calibration.

    Returns:
        A rewound :class:`io.BytesIO` buffer containing the PDF.
    """
    if mode not in ("preprinted", "full"):
        raise ValueError(f"Unknown receipt mode: {mode!r}")

    layout = layout or DEFAULT_LAYOUT
    lines = list(order.lines.select_related("product_packaging__product").all())

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=PAGE_SIZE)
    pdf.setTitle(f"Nota-{order.order_code}")
    pdf.setStrokeColor(Color(0, 0, 0))

    if mode == "full":
        _draw_template(pdf, layout)
    _draw_values(pdf, layout, order, lines, include_faktur_number=(mode == "full"))

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer
