"""Shared aggregation logic for operational cash summary & full report."""

from django.db import models
from django.db.models import Count, Sum, Value
from django.db.models.functions import Coalesce, TruncDate

from .models import EntryKind, OperationalCashEntry


def entries_queryset_for_range(start_d, end_d):
    return (
        OperationalCashEntry.objects.filter(occurred_on__gte=start_d, occurred_on__lte=end_d)
        .select_related("category", "sales_order", "purchase_in_order", "created_by")
        .order_by("occurred_on", "id")
    )


def aggregate_summary(qs):
    income = qs.filter(direction=EntryKind.INCOME).aggregate(
        total_idr=Coalesce(Sum("amount_idr"), Value(0)),
        line_count=Count("id"),
    )
    expense = qs.filter(direction=EntryKind.EXPENSE).aggregate(
        total_idr=Coalesce(Sum("amount_idr"), Value(0)),
        line_count=Count("id"),
    )
    net = int(income["total_idr"] or 0) - int(expense["total_idr"] or 0)
    return income, expense, net


def by_category_rows(qs):
    return list(
        qs.values("category_id", "category__name", "direction")
        .annotate(
            total_idr=Coalesce(Sum("amount_idr"), Value(0)),
            lines=Count("id"),
        )
        .order_by("direction", "-total_idr")
    )


def by_day_rows(qs):
    """List of dicts: occurred_on, income_idr, expense_idr, net_idr."""
    rows = (
        qs.values("occurred_on")
        .annotate(
            income_idr=Coalesce(
                Sum("amount_idr", filter=models.Q(direction=EntryKind.INCOME)),
                Value(0),
            ),
            expense_idr=Coalesce(
                Sum("amount_idr", filter=models.Q(direction=EntryKind.EXPENSE)),
                Value(0),
            ),
        )
        .order_by("occurred_on")
    )
    out = []
    for r in rows:
        inc = int(r["income_idr"] or 0)
        exp = int(r["expense_idr"] or 0)
        out.append(
            {
                "occurred_on": r["occurred_on"].isoformat(),
                "income_idr": inc,
                "expense_idr": exp,
                "net_idr": inc - exp,
            }
        )
    return out


def linked_breakdown(qs):
    linked_sales = qs.filter(sales_order__isnull=False).aggregate(
        total_idr=Coalesce(Sum("amount_idr"), Value(0)),
        line_count=Count("id"),
    )
    linked_purchase = qs.filter(purchase_in_order__isnull=False).aggregate(
        total_idr=Coalesce(Sum("amount_idr"), Value(0)),
        line_count=Count("id"),
    )
    unlinked = qs.filter(sales_order__isnull=True, purchase_in_order__isnull=True).aggregate(
        income_idr=Coalesce(
            Sum("amount_idr", filter=models.Q(direction=EntryKind.INCOME)),
            Value(0),
        ),
        expense_idr=Coalesce(
            Sum("amount_idr", filter=models.Q(direction=EntryKind.EXPENSE)),
            Value(0),
        ),
        line_count=Count("id"),
    )
    return {
        "linked_to_sales_order": linked_sales,
        "linked_to_purchase_in_order": linked_purchase,
        "unlinked": {
            "income_idr": int(unlinked["income_idr"] or 0),
            "expense_idr": int(unlinked["expense_idr"] or 0),
            "line_count": unlinked["line_count"],
        },
    }


def entries_for_json(qs, limit=500):
    total = qs.count()
    rows = []
    for e in qs[:limit]:
        rows.append(
            {
                "id": e.id,
                "occurred_on": e.occurred_on.isoformat(),
                "direction": e.direction,
                "category_id": e.category_id,
                "category_name": e.category.name,
                "amount_idr": e.amount_idr,
                "description": e.description,
                "reference": e.reference or "",
                "sales_order_id": e.sales_order_id,
                "sales_order_code": e.sales_order.order_code if e.sales_order_id else None,
                "purchase_in_order_id": e.purchase_in_order_id,
                "purchase_in_order_code": e.purchase_in_order.order_code if e.purchase_in_order_id else None,
            }
        )
    return {"total_count": total, "returned_count": len(rows), "truncated": total > limit, "rows": rows}
