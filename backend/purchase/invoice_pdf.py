"""Generate simple PDF invoices for sales orders (ReportLab)."""

from decimal import ROUND_HALF_UP, Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _format_idr(value: int) -> str:
    s = f"{int(value):,}".replace(",", ".")
    return f"Rp {s}"


def _packaging_net_mass_label(pp) -> str:
    kg = Decimal(str(pp.net_mass_kg)).normalize()
    txt = format(kg, "f").rstrip("0").rstrip(".") or "0"
    return f"{txt} kg"


def build_sales_order_invoice_pdf(order) -> BytesIO:
    """Build a PDF invoice for a sales order; `order` should have customer and lines prefetched."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title=f"Invoice-{order.order_code}",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "InvTitle",
        parent=styles["Heading1"],
        fontSize=16,
        spaceAfter=6,
    )
    small = ParagraphStyle("Small", parent=styles["Normal"], fontSize=9, textColor=colors.grey)

    story = []
    story.append(Paragraph("INVOICE / NOTA PENJUALAN", title_style))
    story.append(Spacer(1, 4 * mm))

    cust = order.customer
    meta_data = [
        ["No. order", order.order_code],
        ["Status", order.get_status_display()],
        ["Pelanggan", cust.name],
        ["Telepon", cust.phone or "-"],
        ["Alamat", cust.address or "-"],
        ["No. invoice", order.invoice_number or "-"],
        ["Tgl. invoice", str(order.invoice_date) if order.invoice_date else "-"],
        ["Jatuh tempo", str(order.due_date) if order.due_date else "-"],
    ]
    if order.verified_at:
        meta_data.append(["Terverifikasi", str(order.verified_at.date())])

    meta_table = Table(meta_data, colWidths=[40 * mm, 120 * mm])
    meta_table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 8 * mm))

    lines = list(order.lines.select_related("product_packaging__product").all())
    table_data = [["Deskripsi", "Qty", "Harga / kg", "Jumlah"]]
    for line in lines:
        pp = line.product_packaging
        variant = pp.product.variant_name if pp.product_id else ""
        mass_bit = _packaging_net_mass_label(pp)
        desc = f"{variant} — {pp.label} ({mass_bit})" if variant else f"{pp.label} ({mass_bit})"
        line_total = int(line.quantity * line.unit_price_idr)
        net = Decimal(str(pp.net_mass_kg)) if pp is not None else Decimal("0")
        if net > 0:
            per_kg = int(
                (Decimal(int(line.unit_price_idr)) / net).quantize(
                    Decimal("1"), rounding=ROUND_HALF_UP
                )
            )
        else:
            per_kg = int(line.unit_price_idr)
        catalog = int(pp.product.price_per_kg_idr or 0) if pp.product_id else 0
        catalog_pkg = (
            int((Decimal(catalog) * net).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
            if catalog >= 1 and net > 0
            else None
        )
        price_label = _format_idr(per_kg)
        if catalog_pkg is not None and int(line.unit_price_idr) != catalog_pkg:
            price_label = f"{price_label} *"
            desc = f"{desc} (harga khusus)"
        table_data.append(
            [
                Paragraph(desc[:140], small),
                str(line.quantity),
                price_label,
                _format_idr(line_total),
            ]
        )

    items = Table(
        table_data,
        colWidths=[88 * mm, 24 * mm, 38 * mm, 38 * mm],
        repeatRows=1,
    )
    items.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ("ALIGN", (2, 1), (-1, -1), "RIGHT"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(items)
    story.append(Spacer(1, 6 * mm))

    totals = [
        ["Subtotal", _format_idr(int(order.subtotal_idr))],
        ["Pajak", _format_idr(int(order.tax_amount_idr))],
        ["Total", _format_idr(int(order.total_idr))],
    ]
    t2 = Table(totals, colWidths=[130 * mm, 52 * mm])
    t2.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, -1), (-1, -1), 11),
                ("LINEABOVE", (0, -1), (-1, -1), 0.5, colors.black),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t2)
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("Dokumen ini dibuat secara elektronik.", small))

    doc.build(story)
    buffer.seek(0)
    return buffer
