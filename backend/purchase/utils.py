from decimal import Decimal

from django.utils import timezone


def next_order_code(model_class, prefix: str) -> str:
    """Sequential daily code: PI-20260424-0001 / SO-20260424-0001."""
    day = timezone.now().strftime("%Y%m%d")
    stem = f"{prefix}-{day}"
    last = (
        model_class.objects.filter(order_code__startswith=stem)
        .order_by("-order_code")
        .values_list("order_code", flat=True)
        .first()
    )
    if not last:
        seq = 1
    else:
        try:
            seq = int(last.split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    return f"{stem}-{seq:04d}"


def recompute_order_totals(order, *, tax_amount_idr: int | None = None) -> None:
    """Recalculate subtotal/total from related lines (purchase in vs sales)."""
    lines = order.lines.all()
    if not lines.exists():
        order.subtotal_idr = 0
        order.total_idr = int(tax_amount_idr or order.tax_amount_idr)
        return
    sub = Decimal("0")
    for line in lines:
        if hasattr(line, "unit_cost_idr"):
            sub += Decimal(str(line.quantity)) * int(line.unit_cost_idr)
        else:
            sub += Decimal(str(line.quantity)) * int(line.unit_price_idr)
    order.subtotal_idr = int(sub)
    tax = int(tax_amount_idr) if tax_amount_idr is not None else int(order.tax_amount_idr or 0)
    order.tax_amount_idr = tax
    order.total_idr = int(order.subtotal_idr) + tax
