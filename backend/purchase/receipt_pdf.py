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
from decimal import ROUND_HALF_UP, Decimal
from io import BytesIO

from reportlab.lib.colors import Color, black
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from inventory.models import PackagingType

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
    "BARANG² YANG SUDAH DIBELI",
    "TIDAK DAPAT DIKEMBALIKAN/DITUKAR",
)

FONT = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

# Epson LQ glyphs print wider than Helvetica PDF metrics. Inflate measured
# widths so _sized_text / _fit_text shrink or truncate before ink hits a rule.
PRINT_WIDTH_FACTOR = 1.18


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
    """All tunable coordinates, in millimetres measured from the top-left.

    Calibrated against the physical Bon/Faktur pad (Jul 2026 test prints):
    early overlays sat too high / too far left; a later print still let the
    grand total cross the @ Rp · Jumlah Harga rule because ``col_total``
    extended past the table edge and Helvetica widths under-estimated LQ ink.
    Nudge :attr:`offset_x` / :attr:`offset_y` if tractor alignment drifts.
    """

    # Fine-tune after printing on the real pad (mm).
    # Positive offset_x → right; positive offset_y → down.
    offset_x: float = 0.0
    offset_y: float = 0.0

    margin_left: float = 8.0
    margin_right: float = 8.0

    # Header block (company identity, top-left).
    company_name_top: float = 9.0
    brand_top: float = 14.5
    contact_top: float = 19.5
    contact_line_height: float = 3.2
    full_contact_font: float = 7.5

    # Meta block clears the company headline (~8 + 61 mm) with a small gap.
    # "tgl." right edge aligns with "KEPADA YTH. :" so the label sits near the value.
    # Full mode tanggal sits at the same height as "UD. SEJAHTERA BERSAMA".
    date_label_top: float = 9.0
    date_value_top: float = 9.0
    date_label_x: float = 78.0
    full_date_label_right_x: float = 99.0
    date_value_x: float = 100.0
    date_line_left: float = 100.0
    date_line_right: float = 142.0
    # Preprinted pad reads "______ tgl. ______" ("tgl." sits at ~103–107 mm, Oct 2026
    # photo): hari is right-aligned on the left blank, tanggal starts after "tgl.".
    preprinted_day_left: float = 83.0
    preprinted_day_right: float = 100.5
    preprinted_date_left: float = 108.5
    preprinted_date_right: float = 145.0
    preprinted_date_value_top: float = 12.6

    kepada_label_top: float = 15.5
    kepada_label_x: float = 78.0
    # After "KEPADA YTH. :" — sit clear of the pre-printed label (was overlapping at 100).
    kepada_value_x: float = 108.0
    kepada_cont_x: float = 108.0
    # Aligned with the tanggal underline (after "KEPADA YTH. :").
    full_kepada_value_x: float = 100.0
    full_kepada_cont_x: float = 100.0
    kepada_line_tops: tuple[float, ...] = (21.0, 26.8, 32.6)
    # Full mode: name + up to 3 address lines (shifted up with tanggal).
    full_kepada_line_tops: tuple[float, ...] = (15.0, 19.3, 23.6, 27.9)
    # Preprinted: name on the KEPADA YTH. line, alamat on the two pad lines below it.
    preprinted_buyer_top: float = 17.6
    preprinted_buyer_right: float = 145.0
    # (baseline top, left, right) per pad line: a full-width line, then a shorter one.
    preprinted_address_slots: tuple[tuple[float, float, float], ...] = (
        (24.0, 83.0, 145.0),
        (30.2, 101.5, 145.0),
    )
    font_buyer_address: float = 9.0
    font_buyer_address_min: float = 7.0

    # Bon / Faktur number — full mode on the 4th KEPADA line (below WA/HP).
    faktur_label_top: float = 37.5
    faktur_value_top: float = 37.5
    faktur_value_x: float = 48.0
    full_faktur_label_top: float = 27.9
    full_faktur_value_top: float = 27.9
    # Just after "BON / FAKTUR No." (~8 + 26 mm label width).
    full_faktur_value_x: float = 36.0
    full_font_faktur: float = 9.0

    # Table (preprinted pad calibration).
    table_top: float = 40.0
    header_bottom: float = 47.0
    table_bottom: float = 91.0
    first_row_baseline_top: float = 53.0
    row_height: float = 6.0
    row_count: int = 7
    # Full mode: item table + small totals box under @ Rp/kg + Jumlah Harga only.
    full_table_top: float = 32.5
    full_header_bottom: float = 39.5
    full_table_bottom: float = 90.0
    full_totals_bottom: float = 97.5
    full_first_row_baseline_top: float = 45.0

    # Columns stay inside the table (right edge = 150 − margin_right = 142).
    # Qty wide enough for ``5 KTK X 20 KG`` without ellipsis at row font size.
    col_qty: Column = field(default_factory=lambda: Column(8.0, 42.0))
    col_name: Column = field(default_factory=lambda: Column(42.0, 96.0))
    col_unit: Column = field(default_factory=lambda: Column(96.0, 118.0))
    col_total: Column = field(default_factory=lambda: Column(118.0, 142.0))

    cell_padding: float = 1.6
    # Preprinted pad columns differ from the full-mode grid: the Banyaknya rule sits at
    # ~25 mm and Nama Barang runs to ~94 mm (Oct 2026 photo; qty used to spill over).
    preprinted_qty_left: float = 7.5
    preprinted_qty_right: float = 23.5
    preprinted_name_left: float = 26.5
    preprinted_name_right: float = 93.5

    # Overlay value sizes (pt). Long text shrinks down to font_min via _sized_text.
    font_date: float = 10.0
    font_buyer: float = 9.5
    font_row: float = 9.5
    # Banyaknya prefers a touch smaller so ``1 BAL X 2 KG`` stays inside the cell.
    font_qty: float = 8.0
    font_total: float = 10.5
    font_faktur: float = 12.0
    # Shrink before ellipsis when cell text is too wide (banyaknya, totals, etc.).
    font_min: float = 5.5
    # Preprinted cells condense glyphs horizontally (down to this %) before shrinking.
    min_horiz_scale: float = 70.0

    # Footer (outside the table — tanda terima / notice; totals in attached box).
    tanda_terima_top: float = 97.0
    # Center of the gap between TANDA TERIMA and the totals box (~28…96).
    notice_center_x: float = 62.0
    notice_top: float = 94.5
    notice_line_height: float = 2.8
    # Inner horizontal padding of the return-notice rounded box (mm each side).
    full_notice_box_pad_x: float = 1.2
    total_label_top: float = 97.0
    total_label_x: float = 108.0
    total_currency_x: float = 119.5
    total_value_top: float = 97.0
    full_tanda_terima_top: float = 93.0
    full_notice_top: float = 93.0
    full_notice_box_top: float = 91.0
    full_notice_box_bottom: float = 97.5
    full_notice_box_radius: float = 0.8
    full_total_label_top: float = 93.8
    full_total_value_top: float = 93.8
    # Preprinted pad: grand total under Jumlah Harga; nudge up to share Jumlah baseline.
    preprinted_total_value_right: float = 143.0
    preprinted_total_value_top: float = 94.6

    def x(self, left_mm: float) -> float:
        """Convert a left-based millimetre value to canvas units."""
        return (left_mm + self.offset_x) * mm

    def y(self, top_mm: float) -> float:
        """Convert a top-based millimetre value to canvas (bottom-left) units."""
        return (PAGE_HEIGHT_MM - (top_mm + self.offset_y)) * mm

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


def _caps(text: str) -> str:
    """Uppercase for receipt print (dot-matrix nota style)."""
    return (text or "").upper()


def _packaging_jenis(line) -> str:
    """Jenis kemasan code chosen on the sales line (KTK / BAL)."""
    cleaned = str(getattr(line, "packaging_type", "") or "").strip().upper()
    if cleaned in PackagingType.values:
        return cleaned
    return PackagingType.BAL


def _variant_name(packaging) -> str:
    """Product variant name for nama barang, e.g. 'Original'."""
    if packaging is None:
        return "-"
    product = packaging.product if packaging.product_id else None
    variant = (product.variant_name if product else "").strip()
    if variant:
        return variant
    label = (packaging.label or "").strip()
    return label or "-"


def _line_qty_display(line) -> str:
    """Banyaknya: ``4 BAL X 10 KG`` (qty + jenis + net mass per kemasan)."""
    qty = _format_quantity(line.quantity)
    packaging = line.product_packaging
    jenis = _packaging_jenis(line)
    if packaging is None:
        return f"{qty} {jenis}"
    net = Decimal(str(packaging.net_mass_kg or 0))
    if net <= 0:
        return f"{qty} {jenis}"
    return f"{qty} {jenis} X {_format_quantity(net)} KG"


def _line_name_display(line) -> str:
    """Nama barang: ``ORIGINAL (40 KG @ KEMASAN BESAR)``."""
    packaging = line.product_packaging
    variant = _variant_name(packaging)
    if packaging is None:
        return variant
    qty = Decimal(str(line.quantity))
    net = Decimal(str(packaging.net_mass_kg or 0))
    total_kg = _format_quantity(qty * net) if net > 0 else "0"
    label = (packaging.label or "").strip()
    suffix = f"{total_kg} KG"
    if label:
        suffix = f"{suffix} @ {label}"
    return f"{variant} ({suffix})"


def _price_per_kg_idr(line) -> int:
    """Effective harga per kg for a sales line (unit package price ÷ net mass)."""
    packaging = line.product_packaging
    net = Decimal(str(packaging.net_mass_kg)) if packaging is not None else Decimal("0")
    if net <= 0:
        return int(line.unit_price_idr)
    per_kg = Decimal(int(line.unit_price_idr)) / net
    return int(per_kg.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def _printed_width(pdf: canvas.Canvas, text: str, font: str, size: float) -> float:
    """Estimated ink width in points, inflated for Epson LQ vs Helvetica metrics."""
    return pdf.stringWidth(text, font, size) * PRINT_WIDTH_FACTOR


def _fit_text(pdf: canvas.Canvas, text: str, font: str, size: float, max_width: float) -> str:
    """Truncate ``text`` (adding an ellipsis) so it fits within ``max_width`` mm."""
    limit = max_width * mm
    if _printed_width(pdf, text, font, size) <= limit:
        return text
    ellipsis = "…"
    trimmed = text
    while trimmed and _printed_width(pdf, trimmed + ellipsis, font, size) > limit:
        trimmed = trimmed[:-1]
    return (trimmed + ellipsis) if trimmed else ""


def _sized_text(
    pdf: canvas.Canvas,
    text: str,
    font: str,
    preferred: float,
    max_width: float,
    min_size: float,
) -> tuple[str, float]:
    """Pick the largest font ≤ ``preferred`` that fits ``max_width`` mm; else truncate."""
    size = preferred
    limit = max_width * mm
    while size > min_size and _printed_width(pdf, text, font, size) > limit:
        size -= 0.5
    if _printed_width(pdf, text, font, size) <= limit:
        return text, size
    return _fit_text(pdf, text, font, size, max_width), size


def _draw_fitted(
    pdf: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    font: str,
    preferred: float,
    max_width: float,
    min_size: float,
    min_scale: float,
) -> float:
    """Draw ``text`` left-aligned within ``max_width`` mm; return its printed width (mm).

    Narrow pad cells keep a readable height by condensing glyphs horizontally
    first (down to ``min_scale`` %), then shrinking the font, then truncating.
    """
    limit = max_width * mm
    size = preferred
    scale = 100.0
    natural = _printed_width(pdf, text, font, size)
    if natural > limit:
        scale = max(min_scale, float(int(limit / natural * 100)))
        while size > min_size and _printed_width(pdf, text, font, size) * scale / 100 > limit:
            size -= 0.5
        text = _fit_text(pdf, text, font, size, max_width * 100 / scale)
    # Horizontal scale is PDF graphics state; scope it so later text is not condensed.
    pdf.saveState()
    text_obj = pdf.beginText(x, y)
    text_obj.setFont(font, size)
    text_obj.setHorizScale(scale)
    text_obj.textOut(text)
    pdf.drawText(text_obj)
    pdf.restoreState()
    return _printed_width(pdf, text, font, size) * scale / 100 / mm


def _wrap_into_slots(
    pdf: canvas.Canvas,
    text: str,
    font: str,
    preferred: float,
    min_size: float,
    widths: list[float],
) -> tuple[list[str], float]:
    """Word-wrap ``text`` across lines of the given widths (mm), one line per slot.

    Shrinks from ``preferred`` to ``min_size`` until everything fits; otherwise the
    last slot ends with an ellipsis.
    """
    words = text.split()

    def fill(size: float) -> tuple[list[str], int]:
        lines: list[str] = []
        index = 0
        for width in widths:
            if index >= len(words):
                break
            line = words[index]
            index += 1
            while index < len(words) and (
                _printed_width(pdf, f"{line} {words[index]}", font, size) <= width * mm
            ):
                line = f"{line} {words[index]}"
                index += 1
            lines.append(line)
        return lines, index

    size = preferred
    lines, used = fill(size)
    while used < len(words) and size > min_size:
        size -= 0.5
        lines, used = fill(size)
    if used < len(words) and lines:
        lines[-1] = " ".join([lines[-1], *words[used:]])
    fitted = [_fit_text(pdf, line, font, size, width) for line, width in zip(lines, widths)]
    return fitted, size


_DAY_NAME_ID = (
    "SENIN",
    "SELASA",
    "RABU",
    "KAMIS",
    "JUMAT",
    "SABTU",
    "MINGGU",
)


def _receipt_day_and_date(order) -> tuple[str, str]:
    """Hari and tanggal for the nota: ``("KAMIS", "23-07-2026")``."""
    value = order.invoice_date
    if value is None and order.created_at is not None:
        value = order.created_at.date()
    if not value:
        return "", ""
    return _DAY_NAME_ID[value.weekday()], value.strftime("%d-%m-%Y")


def _receipt_date(order) -> str:
    """Tanggal nota: ``KAMIS 23-07-2026`` (hari + tanggal, no hyphen)."""
    return " ".join(part for part in _receipt_day_and_date(order) if part)


def _address_lines(customer, max_lines: int) -> list[str]:
    address = (customer.address or "").strip()
    if not address:
        return []
    parts = [seg.strip() for seg in address.replace("\r", "").split("\n") if seg.strip()]
    return parts[:max_lines]


def _wrap_text(
    pdf: canvas.Canvas,
    text: str,
    font: str,
    size: float,
    max_width: float,
) -> list[str]:
    """Word-wrap ``text`` to ``max_width`` mm at a fixed font size (no shrink/truncate)."""
    text = (text or "").strip()
    if not text:
        return []
    limit = max_width * mm
    if _printed_width(pdf, text, font, size) <= limit:
        return [text]

    words = text.split()
    if not words:
        return [text]

    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip() if current else word
        if _printed_width(pdf, candidate, font, size) <= limit:
            current = candidate
            continue
        if current:
            lines.append(current)
            current = word
        else:
            # Single token wider than the line — keep it whole (no truncate).
            lines.append(word)
            current = ""
    if current:
        lines.append(current)
    return lines


def _draw_template(pdf: canvas.Canvas, layout: ReceiptLayout) -> None:
    """Draw the static parts of the form (header, labels, grid)."""
    left = layout.margin_left

    pdf.setFillColor(black)
    pdf.setFont(FONT_BOLD, 13)
    pdf.drawString(layout.x(left), layout.y(layout.company_name_top), COMPANY_NAME)
    pdf.setFont(FONT_BOLD, 10)
    pdf.drawString(layout.x(left + 8), layout.y(layout.brand_top), COMPANY_BRAND)
    pdf.setFont(FONT, layout.full_contact_font)
    for index, line in enumerate(COMPANY_CONTACT):
        top = layout.contact_top + index * layout.contact_line_height
        pdf.drawString(layout.x(left + 6), layout.y(top), line)

    # Meta labels (tanggal + kepada yth.) with their fill-in rules.
    # Full mode: "tgl." right-aligned with KEPADA YTH, then the date on the line.
    pdf.setLineWidth(0.4)
    pdf.line(
        layout.x(layout.date_line_left),
        layout.y(layout.date_label_top + 0.8),
        layout.x(layout.date_line_right),
        layout.y(layout.date_label_top + 0.8),
    )
    pdf.setFont(FONT_BOLD, 8)
    pdf.drawRightString(
        layout.x(layout.full_date_label_right_x),
        layout.y(layout.date_label_top),
        "TGL.",
    )
    pdf.setFont(FONT_BOLD, 8)
    pdf.drawString(layout.x(layout.kepada_label_x), layout.y(layout.kepada_label_top), "KEPADA YTH. :")
    pdf.setLineWidth(0.4)
    right_edge = layout.x(PAGE_WIDTH_MM - layout.margin_right)
    for index, top in enumerate(layout.full_kepada_line_tops):
        line_start = layout.full_kepada_value_x if index == 0 else layout.full_kepada_cont_x
        pdf.line(layout.x(line_start), layout.y(top + 0.8), right_edge, layout.y(top + 0.8))

    # Bon / Faktur label.
    pdf.setFont(FONT_BOLD, 8)
    pdf.drawString(layout.x(left), layout.y(layout.full_faktur_label_top), "BON / FAKTUR NO.")

    # Main item table.
    right = PAGE_WIDTH_MM - layout.margin_right
    top_y = layout.y(layout.full_table_top)
    bottom_y = layout.y(layout.full_table_bottom)
    totals_bottom_y = layout.y(layout.full_totals_bottom)
    pdf.setLineWidth(0.6)
    pdf.rect(layout.x(left), bottom_y, (right - left) * mm, (top_y - bottom_y), stroke=1, fill=0)
    pdf.setLineWidth(0.4)
    pdf.line(
        layout.x(left),
        layout.y(layout.full_header_bottom),
        layout.x(right),
        layout.y(layout.full_header_bottom),
    )
    for column in layout.columns[:-1]:
        pdf.line(layout.x(column.right), top_y, layout.x(column.right), bottom_y)

    # Totals box — only under @ Rp/kg + Jumlah Harga (attached below the table).
    totals_left = layout.col_unit.left
    pdf.setLineWidth(0.6)
    pdf.rect(
        layout.x(totals_left),
        totals_bottom_y,
        (right - totals_left) * mm,
        (bottom_y - totals_bottom_y),
        stroke=1,
        fill=0,
    )
    pdf.setLineWidth(0.4)
    pdf.line(
        layout.x(layout.col_unit.right),
        bottom_y,
        layout.x(layout.col_unit.right),
        totals_bottom_y,
    )

    # Column headers.
    header_baseline = layout.y((layout.full_table_top + layout.full_header_bottom) / 2 + 1.2)
    pdf.setFont(FONT_BOLD, 7.5)
    pdf.drawCentredString(layout.x(layout.col_qty.center), header_baseline, "BANYAKNYA")
    pdf.drawCentredString(layout.x(layout.col_name.center), header_baseline, "NAMA BARANG")
    pdf.drawCentredString(layout.x(layout.col_unit.center), header_baseline, "@ RP/KG")
    pdf.drawCentredString(layout.x(layout.col_total.center), header_baseline, "JUMLAH HARGA")

    # Footer labels (outside the table, same as before).
    pdf.setFont(FONT, 7.5)
    pdf.drawString(layout.x(left), layout.y(layout.full_tanda_terima_top), "TANDA TERIMA")

    # Return-notice box: centered in the gap, snug left/right padding around text.
    notice_font_size = 5.5
    pdf.setFont(FONT, notice_font_size)
    notice_text_width_mm = max(
        (_printed_width(pdf, line, FONT, notice_font_size) / mm) for line in RETURN_NOTICE
    )
    notice_half_width = (notice_text_width_mm / 2.0) + layout.full_notice_box_pad_x
    # Keep clear of TANDA TERIMA on the left and the totals box on the right.
    min_center = left + 22.0 + notice_half_width
    max_center = layout.col_unit.left - 1.5 - notice_half_width
    notice_center = min(max(layout.notice_center_x, min_center), max_center)
    notice_left = notice_center - notice_half_width
    notice_right = notice_center + notice_half_width
    notice_bottom_y = layout.y(layout.full_notice_box_bottom)
    notice_top_y = layout.y(layout.full_notice_box_top)
    pdf.setLineWidth(0.4)
    pdf.roundRect(
        layout.x(notice_left),
        notice_bottom_y,
        (notice_right - notice_left) * mm,
        (notice_top_y - notice_bottom_y),
        layout.full_notice_box_radius * mm,
        stroke=1,
        fill=0,
    )
    for index, line in enumerate(RETURN_NOTICE):
        top = layout.full_notice_top + index * layout.notice_line_height
        pdf.drawCentredString(layout.x(notice_center), layout.y(top), line)

    # Totals labels inside the attached box.
    pdf.setFont(FONT_BOLD, 8)
    pdf.drawCentredString(
        layout.x(layout.col_unit.center),
        layout.y(layout.full_total_label_top),
        "JUMLAH",
    )
    pdf.drawString(
        layout.x(layout.col_total.left + layout.cell_padding),
        layout.y(layout.full_total_label_top),
        "RP.",
    )


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
    if include_faktur_number:
        date_text = _caps(_receipt_date(order))
        if date_text:
            text, size = _sized_text(
                pdf,
                date_text,
                FONT,
                layout.font_date,
                layout.date_line_right - layout.date_line_left,
                layout.font_min,
            )
            pdf.setFont(FONT, size)
            pdf.drawString(layout.x(layout.date_value_x), layout.y(layout.date_value_top), text)
    else:
        # Pad: "<hari> tgl. <tanggal>" — never print across the "tgl." label.
        day_text, date_text = _receipt_day_and_date(order)
        top = layout.y(layout.preprinted_date_value_top)
        if day_text:
            text, size = _sized_text(
                pdf,
                day_text,
                FONT_BOLD,
                layout.font_date,
                layout.preprinted_day_right - layout.preprinted_day_left,
                layout.font_min,
            )
            pdf.setFont(FONT_BOLD, size)
            pdf.drawRightString(layout.x(layout.preprinted_day_right), top, text)
        if date_text:
            text, size = _sized_text(
                pdf,
                date_text,
                FONT_BOLD,
                layout.font_date,
                layout.preprinted_date_right - layout.preprinted_date_left,
                layout.font_min,
            )
            pdf.setFont(FONT_BOLD, size)
            pdf.drawString(layout.x(layout.preprinted_date_left), top, text)

    # Kepada Yth. — name then alamat.
    if include_faktur_number:
        name_x = layout.full_kepada_value_x
        kepada_tops = layout.full_kepada_line_tops
        buyer_width = PAGE_WIDTH_MM - layout.margin_right - name_x
        wrapped: list[str] = []
        if order.customer_id:
            wrapped.extend(
                _wrap_text(
                    pdf,
                    _caps(order.customer.name.strip()),
                    FONT,
                    layout.font_buyer,
                    buyer_width,
                )
            )
        address = " ".join(_address_lines(order.customer, max_lines=8))
        if address:
            wrapped.extend(
                _wrap_text(pdf, _caps(address), FONT, layout.font_buyer, buyer_width)
            )
        pdf.setFont(FONT, layout.font_buyer)
        for raw, top in zip(wrapped, kepada_tops):
            pdf.drawString(layout.x(name_x), layout.y(top), raw)
    else:
        # Nota lama (preprinted): name on the KEPADA YTH. line, alamat on the pad lines below.
        name_x = layout.kepada_value_x
        if order.customer_id:
            _draw_fitted(
                pdf,
                layout.x(name_x),
                layout.y(layout.preprinted_buyer_top),
                _caps(order.customer.name.strip()),
                FONT,
                layout.font_buyer,
                layout.preprinted_buyer_right - name_x,
                layout.font_buyer_address_min,
                layout.min_horiz_scale,
            )

        address = " ".join(_address_lines(order.customer, max_lines=12))
        if address:
            slots = layout.preprinted_address_slots
            addr_lines, addr_size = _wrap_into_slots(
                pdf,
                _caps(address),
                FONT,
                layout.font_buyer_address,
                layout.font_buyer_address_min,
                [right - left for _, left, right in slots],
            )
            pdf.setFont(FONT, addr_size)
            for raw, (top, left, _) in zip(addr_lines, slots):
                pdf.drawString(layout.x(left), layout.y(top), raw)

    # Bon / Faktur number (full mode only; pad already has the red serial).
    if include_faktur_number:
        faktur = _caps((order.invoice_number or order.order_code or "").strip())
        if faktur:
            pdf.setFillColor(black)
            pdf.setFont(FONT, layout.full_font_faktur)
            pdf.drawString(
                layout.x(layout.full_faktur_value_x),
                layout.y(layout.full_faktur_value_top),
                faktur,
            )

    # Item rows — size each cell to its column so amounts fill @ Rp / Jumlah Harga.
    qty_width = (layout.col_qty.right - layout.col_qty.left) - 2 * layout.cell_padding
    name_width = (layout.col_name.right - layout.col_name.left) - 2 * layout.cell_padding
    unit_width = (layout.col_unit.right - layout.col_unit.left) - 2 * layout.cell_padding
    total_width = (layout.col_total.right - layout.col_total.left) - 2 * layout.cell_padding
    first_row_top = (
        layout.full_first_row_baseline_top if include_faktur_number else layout.first_row_baseline_top
    )
    for index, line in enumerate(lines):
        baseline = layout.y(first_row_top + index * layout.row_height)

        qty_raw = _caps(_line_qty_display(line))
        name_raw = _caps(_line_name_display(line))
        if include_faktur_number:
            qty_text, qty_size = _sized_text(
                pdf, qty_raw, FONT, layout.font_row, qty_width, layout.font_min
            )
            pdf.setFont(FONT, qty_size)
            pdf.drawCentredString(layout.x(layout.col_qty.center), baseline, qty_text)

            name_text, name_size = _sized_text(
                pdf, name_raw, FONT, layout.font_row, name_width, layout.font_min
            )
            pdf.setFont(FONT, name_size)
            pdf.drawString(layout.x(layout.col_name.left + layout.cell_padding), baseline, name_text)
        else:
            # Pad cells are narrow: condense before shrinking so text stays inside the rules.
            _draw_fitted(
                pdf,
                layout.x(layout.preprinted_qty_left),
                baseline,
                qty_raw,
                FONT,
                layout.font_qty,
                layout.preprinted_qty_right - layout.preprinted_qty_left,
                layout.font_min,
                layout.min_horiz_scale,
            )
            _draw_fitted(
                pdf,
                layout.x(layout.preprinted_name_left),
                baseline,
                name_raw,
                FONT,
                layout.font_row,
                layout.preprinted_name_right - layout.preprinted_name_left,
                layout.font_min,
                layout.min_horiz_scale,
            )

        unit_text, unit_size = _sized_text(
            pdf,
            _format_thousands(_price_per_kg_idr(line)),
            FONT,
            layout.font_row,
            unit_width,
            layout.font_min,
        )
        pdf.setFont(FONT, unit_size)
        if include_faktur_number:
            pdf.drawRightString(
                layout.x(layout.col_unit.right - layout.cell_padding),
                baseline,
                unit_text,
            )
        else:
            # Preprinted pad: sit nearer the middle of the @ Rp column.
            pdf.drawCentredString(layout.x(layout.col_unit.center), baseline, unit_text)

        line_total_text, line_total_size = _sized_text(
            pdf,
            _format_thousands(int(line.line_total_idr)),
            FONT,
            layout.font_row,
            total_width,
            layout.font_min,
        )
        pdf.setFont(FONT, line_total_size)
        pdf.drawRightString(
            layout.x(layout.col_total.right - layout.cell_padding),
            baseline,
            line_total_text,
        )

    # Grand total — full mode sits in the Jumlah Harga totals cell (right of JUMLAH).
    grand = _format_thousands(int(order.total_idr))
    if include_faktur_number:
        # Amount uses the full Jumlah Harga cell; "RP." stays on the left.
        amount_right = layout.col_total.right - layout.cell_padding
        amount_width = max(
            6.0,
            (layout.col_total.right - layout.col_total.left) - 2 * layout.cell_padding - 7.0,
        )
        grand_text, grand_size = _sized_text(
            pdf, grand, FONT, layout.font_row, amount_width, layout.font_min
        )
        pdf.setFont(FONT, grand_size)
        pdf.drawRightString(
            layout.x(amount_right),
            layout.y(layout.full_total_value_top),
            grand_text,
        )
    else:
        total_right = layout.preprinted_total_value_right
        total_top = layout.preprinted_total_value_top
        grand_text, grand_size = _sized_text(
            pdf, grand, FONT_BOLD, layout.font_total, total_width, layout.font_min
        )
        pdf.setFont(FONT_BOLD, grand_size)
        pdf.drawRightString(layout.x(total_right), layout.y(total_top), grand_text)


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
    lines = list(
        order.lines.select_related("product_packaging", "product_packaging__product").all()
    )

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
