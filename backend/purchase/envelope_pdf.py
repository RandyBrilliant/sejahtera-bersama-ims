"""Generate the shipping envelope ('amplop') print for a sales order.

Matches the client's Excel amplop sheet: the per-line weight summary
(``1 KTK X 20 KG = 20 KG``) and the product line sit top-left, the
``KPD. YTH.`` block (name, alamat) sits bottom-right.

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
    _variant_name,
    _wrap_into_slots,
)

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
    # Crowded orders start higher so every row stays clear of Kpd. Yth.
    summary_top_min: float = 10.0
    summary_line_height: float = 8.5
    summary_line_height_min: float = 3.0
    font_summary: float = 18.0

    # Product block under the summary, indented like the Excel sheet: the product
    # name (``BAWANG GORENG``) then each distinct variant on its own row.
    product_left: float = 90.0
    # Baseline distance from the last summary row to the product name.
    product_gap: float = 11.0
    product_gap_min: float = 9.0
    # Keep the summary + product clear of the Kpd. Yth. label.
    kepada_clearance: float = 10.0
    font_product: float = 20.0
    font_product_item: float = 18.0

    # Kpd. Yth. block (bottom-right).
    kepada_left: float = 107.0
    kepada_top: float = 64.0
    kepada_line_height: float = 9.5
    font_kepada_label: float = 15.0
    font_kepada_name: float = 22.0
    font_kepada: float = 18.0
    font_kepada_min: float = 11.0
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


def _product_name_text(lines) -> str:
    """``BAWANG GORENG`` — distinct product names in order of appearance."""
    names: list[str] = []
    for line in lines:
        packaging = line.product_packaging
        product = packaging.product if packaging is not None and packaging.product_id else None
        name = _caps((product.name if product else "").strip())
        if name and name not in names:
            names.append(name)
    return " · ".join(names)


def _variant_texts(lines) -> list[str]:
    """Distinct variant names, e.g. ``NYONYA MERAH / NOHNAH``, in order of appearance.

    Printed as-is (no qty / kemasan) so the client can circle the right name.
    """
    names: list[str] = []
    for line in lines:
        name = _caps(_variant_name(line.product_packaging))
        if name and name != "-" and name not in names:
            names.append(name)
    return names


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

    # Summary rows, then the product name and one row per variant. Long orders
    # start higher, tighten the gap, then the rows; text scales with the row height
    # so the block never reaches Kpd. Yth.
    product_name = _product_name_text(lines)
    variants = _variant_texts(lines) if product_name else []
    n = len(lines)
    limit = layout.kepada_top - layout.kepada_clearance
    start = layout.summary_top
    row_height = layout.summary_line_height
    gap = layout.product_gap if product_name else 0.0
    rows = max(n - 1, 0) + len(variants)

    def fits(top_mm: float, gap_mm: float, row_mm: float) -> bool:
        return top_mm + rows * row_mm + gap_mm <= limit

    if rows and not fits(start, gap, row_height):
        start = layout.summary_top_min
        if product_name and not fits(start, gap, row_height):
            gap = max(layout.product_gap_min, limit - start - rows * row_height)
        if not fits(start, gap, row_height):
            row_height = max(layout.summary_line_height_min, (limit - start - gap) / rows)
    scale = row_height / layout.summary_line_height

    top = start
    for index, line in enumerate(lines):
        top = start + index * row_height
        _draw_left(
            pdf, layout, layout.summary_left, top, _summary_text(line), FONT, layout.font_summary * scale
        )

    if product_name:
        top += gap
        _draw_left(
            pdf, layout, layout.product_left, top, product_name, FONT_BOLD, layout.font_product * min(1, scale * 1.1)
        )
        for variant in variants:
            top += row_height
            _draw_left(
                pdf, layout, layout.product_left, top, variant, FONT, layout.font_product_item * scale
            )

    # Kpd. Yth. — label, name, then alamat (no phone on the amplop).
    customer = order.customer if order.customer_id else None
    top = layout.kepada_top
    _draw_left(pdf, layout, layout.kepada_left, top, "KPD. YTH.", FONT, layout.font_kepada_label)
    if customer is not None:
        top += layout.kepada_line_height
        _draw_left(
            pdf, layout, layout.kepada_left, top, _caps(customer.name.strip()), FONT_BOLD, layout.font_kepada_name
        )
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
