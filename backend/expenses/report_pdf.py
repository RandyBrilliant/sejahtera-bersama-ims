"""Operational cash report PDF (ReportLab)."""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def build_operational_cash_report_pdf(title: str, summary_rows: list[tuple], by_day_rows: list, entry_rows: list, max_entries: int = 150) -> BytesIO:
    """
    summary_rows: list of (label, value_str))
    by_day_rows: list of [date_str, income_str, expense_str, net_str] including header
    entry_rows: list of [occurred_on, direction, category, amount, desc_short, ref, links]
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=title,
    )
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=14, spaceAfter=6)
    small = ParagraphStyle("S", parent=styles["Normal"], fontSize=8, textColor=colors.grey)

    story = [Paragraph(title, h1), Spacer(1, 4 * mm)]

    st = Table(summary_rows, colWidths=[70 * mm, 100 * mm])
    st.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f5f5f5")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(st)
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("Per hari", styles["Heading2"]))
    dt = Table(by_day_rows, colWidths=[28 * mm, 32 * mm, 32 * mm, 32 * mm])
    dt.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eeeeee")),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ]
        )
    )
    story.append(dt)
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("Detail baris (terbatas)", styles["Heading2"]))
    et = Table(entry_rows[: max_entries + 1], colWidths=[22 * mm, 18 * mm, 32 * mm, 28 * mm, 52 * mm])
    et.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 7),
                ("GRID", (0, 0), (-1, -1), 0.15, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(et)
    if len(entry_rows) - 1 > max_entries:
        story.append(Spacer(1, 3 * mm))
        story.append(
            Paragraph(
                f"Catatan: hanya {max_entries} baris pertama ditampilkan. Gunakan ekspor CSV untuk data lengkap.",
                small,
            )
        )

    doc.build(story)
    buffer.seek(0)
    return buffer
