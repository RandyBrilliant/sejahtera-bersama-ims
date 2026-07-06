"""Aggregated admin dashboard payload (single round-trip for the home screen)."""

from datetime import date, datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from expenses.reporting import aggregate_summary, entries_queryset_for_range
from inventory.models import IngredientInventory, ProductPackaging
from inventory.product_stock import annotate_packaging_derived_remaining
from inventory.serializers import IngredientInventorySerializer, ProductPackagingSerializer
from inventory.summary import get_inventory_summary_cached
from purchase.models import OrderStatus, PurchaseInOrder, SalesOrder

User = get_user_model()


def rolling_7_days_through_today() -> tuple[date, date]:
    end = timezone.localdate()
    start = end - timedelta(days=6)
    return start, end


def previous_rolling_7_days_block() -> tuple[date, date]:
    end = timezone.localdate() - timedelta(days=7)
    start = end - timedelta(days=6)
    return start, end


def _active_order_count(model, verified_status: str, cancelled_status: str) -> int:
    agg = model.objects.aggregate(
        total=Count("id"),
        verified=Count("id", filter=Q(status=verified_status)),
        cancelled=Count("id", filter=Q(status=cancelled_status)),
    )
    return max(0, agg["total"] - agg["verified"] - agg["cancelled"])


def _revenue_summary(start_d: date, end_d: date) -> dict:
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(start_d, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(end_d, time.max), tz)
    base_qs = SalesOrder.objects.filter(
        status=OrderStatus.VERIFIED,
        verified_at__gte=start_dt,
        verified_at__lte=end_dt,
    )
    summary = base_qs.aggregate(
        verified_order_count=Count("id"),
        total_revenue_idr=Coalesce(Sum("total_idr"), Value(0)),
        total_subtotal_idr=Coalesce(Sum("subtotal_idr"), Value(0)),
        total_tax_idr=Coalesce(Sum("tax_amount_idr"), Value(0)),
    )
    return {
        "start_date": start_d.isoformat(),
        "end_date": end_d.isoformat(),
        "summary": summary,
    }


def _operational_cash_summary(start_d: date, end_d: date) -> dict:
    qs = entries_queryset_for_range(start_d, end_d)
    income, expense, net = aggregate_summary(qs)
    return {
        "start_date": start_d.isoformat(),
        "end_date": end_d.isoformat(),
        "income": income,
        "expense": expense,
        "net_cash_idr": net,
    }


def _order_activity_row(order, *, kind: str) -> dict:
    return {
        "id": order.id,
        "order_code": order.order_code,
        "status": order.status,
        "created_at": order.created_at.isoformat(),
        "kind": kind,
    }


def build_admin_dashboard_payload() -> dict:
    range_current = rolling_7_days_through_today()
    range_prev = previous_rolling_7_days_block()

    active_sales = _active_order_count(
        SalesOrder,
        OrderStatus.VERIFIED,
        OrderStatus.CANCELLED,
    )
    active_purchase = _active_order_count(
        PurchaseInOrder,
        OrderStatus.VERIFIED,
        OrderStatus.CANCELLED,
    )

    top_qs = annotate_packaging_derived_remaining(
        ProductPackaging.objects.filter(is_active=True).select_related(
            "product",
            "created_by",
            "updated_by",
        )
    ).order_by("-remaining_stock")[:8]

    low_qs = (
        IngredientInventory.objects.select_related(
            "ingredient",
            "created_by",
            "updated_by",
        )
        .filter(remaining_stock__lt=F("minimum_stock"))
        .order_by("remaining_stock")[:8]
    )

    recent_sales = list(SalesOrder.objects.order_by("-created_at")[:6])
    recent_purchases = list(PurchaseInOrder.objects.order_by("-created_at")[:6])
    recent_activity = sorted(
        [_order_activity_row(o, kind="sales") for o in recent_sales]
        + [_order_activity_row(o, kind="purchase") for o in recent_purchases],
        key=lambda row: row["created_at"],
        reverse=True,
    )[:8]

    users_total = User.objects.count()
    users_active = User.objects.filter(is_active=True).count()

    return {
        "range_current": {
            "start_date": range_current[0].isoformat(),
            "end_date": range_current[1].isoformat(),
        },
        "range_previous": {
            "start_date": range_prev[0].isoformat(),
            "end_date": range_prev[1].isoformat(),
        },
        "orders": {
            "active_sales": active_sales,
            "active_purchase": active_purchase,
            "active_total": active_sales + active_purchase,
        },
        "revenue": {
            "current": _revenue_summary(*range_current),
            "previous": _revenue_summary(*range_prev),
        },
        "operational_cash": {
            "current": _operational_cash_summary(*range_current),
            "previous": _operational_cash_summary(*range_prev),
        },
        "inventory_summary": get_inventory_summary_cached(),
        "top_packaging": {
            "results": ProductPackagingSerializer(top_qs, many=True).data,
        },
        "low_ingredient_stock": {
            "results": IngredientInventorySerializer(low_qs, many=True).data,
        },
        "recent_activity": {
            "results": recent_activity,
        },
        "users": {
            "total": users_total,
            "active": users_active,
        },
    }
