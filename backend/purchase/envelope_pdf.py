"""Generate the shipping envelope ('amplop') print for a sales order.

Matches the client's Excel amplop sheet: the per-line weight summary
(``1 KTK X 20 KG = 20 KG``) and the product line sit top-left, the
``KPD. YTH.`` block (name, phone, alamat) sits bottom-right.

Printed on the Epson LQ; the default page is an amplop 90 (230 x 110 mm).
All coordinates live in :class:`EnvelopeLayout` (millimetres from the top-left)
so the print can be calibrated without touching the drawing code.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from io import BytesIO

from reportlab.lib.colors import black
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .receipt_pdf import (
    FONT,
    FONT_BOLD,
    _address_lines,
    _caps,
    _format_quantity,
    _line_qty_display,
    _sized_text,
    _wrap_into_slots,
)

ENVELOPE_BRAND = "CAP NYONYA"


@dataclass(frozen=True)
class EnvelopeLayout:
    """Tunable coordinates in millimetres, measured from the top-left corner."""

    page_width: float = 230.0
    page_height: float = 110.0
    # Fine-tune after a test print. Positive offset_x → right; positive offset_y → down.
    offset_x: float = 0.0
    offset_y: float = 0.0
    margin_right: float = 12.0

    # Weight summary, one row per order line.
    summary_left: float = 30.0
    summary_top: float = 20.0
    summary_line_height: float = 6.0
    summary_line_height_min: float = 4.2
    font_summary: float = 12.0

    # Product line under the summary, indented like the Excel sheet.
    product_left: float = 90.0
    # Baseline distance from the last summary row to the product line.
    product_gap: float = 10.0
    # Keep the summary + product clear of the Kpd. Yth. label.
    kepada_clearance: float = 8.0
    font_product: float = 12.0

    # Kpd. Yth. block (bottom-right).
    kepada_left: float = 107.0
    kepada_top: float = 66.0
    kepada_line_height: float = 7.0
    font_kepada_label: float = 11.0
    font_kepada_name: float = 14.0
    font_kepada: float = 12.0
    font_kepada_min: float = 8.0
    address_max_lines: int = 3

    font_min: float = 7.0

    @property
    def page_size(self) -> tuple[float, float]:
        return (self.page_width * mm, self.page_height * mm)

    def x(self, left_mm: float) -> float:
        return (left_mm + self.offset_x) * mm

    def y(self, top_mm: float) -> float:
        return (self.page_height - (top_mm + self.offset_y)) * mm


DEFAULT_ENVELOPE_LAYOUT = EnvelopeLayout()


def _line_total_kg(line) -> Decimal:
    packaging = line.product_packaging
    net = Decimal(str(packaging.net_mass_kg or 0)) if packaging is not None else Decimal("0")
    return Decimal(str(line.quantity)) * net


def _summary_text(line) -> str:
    """``1 KTK X 20 KG = 20 KG``."""
    return f"{_line_qty_display(line)} = {_format_quantity(_line_total_kg(line))} KG"


def _product_text(lines) -> str:
    """``BAWANG GORENG CAP NYONYA`` — distinct product names in order of appearance."""
    names: list[str] = []
    for line in lines:
        packaging = line.product_packaging
        product = packaging.product if packaging is not None and packaging.product_id else None
        name = _caps((product.name if product else "").strip())
        if name and name not in names:
            names.append(name)
    if not names:
        return ""
    return f"{' / '.join(names)} {ENVELOPE_BRAND}"


def _draw_left(pdf, layout: EnvelopeLayout, x_mm: float, top_mm: float, text, font, size):
    """Left-aligned text, shrunk (then truncated) to stay inside the right margin."""
    width = layout.page_width - layout.margin_right - x_mm
    fitted, fitted_size = _sized_text(pdf, text, font, size, width, layout.font_min)
    pdf.setFont(font, fitted_size)
    pdf.drawString(layout.x(x_mm), layout.y(top_mm), fitted)


def build_sales_order_envelope_pdf(order, *, layout: EnvelopeLayout | None = None) -> BytesIO:
    """Build the amplop PDF for ``order`` (``customer`` and ``lines`` prefetched)."""
    layout = layout or DEFAULT_ENVELOPE_LAYOUT
    lines = list(
        order.lines.select_related("product_packaging", "product_packaging__product").all()
    )

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=layout.page_size)
    pdf.setTitle(f"Amplop-{order.order_code}")
    pdf.setFillColor(black)

    # Summary rows tighten when an order has many lines so they never reach Kpd. Yth.
    product_text = _product_text(lines)
    last_row_limit = layout.kepada_top - layout.kepada_clearance
    if product_text:
        last_row_limit -= layout.product_gap
    row_height = layout.summary_line_height
    if len(lines) > 1:
        fit = (last_row_limit - layout.summary_top) / (len(lines) - 1)
        row_height = max(layout.summary_line_height_min, min(row_height, fit))
    top = layout.summary_top
    for index, line in enumerate(lines):
        top = layout.summary_top + index * row_height
        _draw_left(pdf, layout, layout.summary_left, top, _summary_text(line), FONT, layout.font_summary)

    if product_text:
        _draw_left(
            pdf, layout, layout.product_left, top + layout.product_gap, product_text, FONT_BOLD, layout.font_product
        )

    # Kpd. Yth. — label, name, phone (if any), then alamat.
    customer = order.customer if order.customer_id else None
    top = layout.kepada_top
    _draw_left(pdf, layout, layout.kepada_left, top, "KPD. YTH.", FONT, layout.font_kepada_label)
    if customer is not None:
        top += layout.kepada_line_height
        _draw_left(
            pdf, layout, layout.kepada_left, top, _caps(customer.name.strip()), FONT_BOLD, layout.font_kepada_name
        )
        phone = (customer.phone or "").strip()
        if phone:
            top += layout.kepada_line_height
            _draw_left(pdf, layout, layout.kepada_left, top, phone, FONT, layout.font_kepada)
        address = " ".join(_address_lines(customer, max_lines=12))
        if address:
            width = layout.page_width - layout.margin_right - layout.kepada_left
            addr_lines, addr_size = _wrap_into_slots(
                pdf,
                _caps(address),
                FONT,
                layout.font_kepada,
                layout.font_kepada_min,
                [width] * layout.address_max_lines,
            )
            pdf.setFont(FONT, addr_size)
            for raw in addr_lines:
                top += layout.kepada_line_height * 0.8
                pdf.drawString(layout.x(layout.kepada_left), layout.y(top), raw)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer
