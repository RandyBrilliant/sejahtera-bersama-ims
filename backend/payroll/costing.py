"""Aggregate production labor cost per date range for HPP/COGS (read-only)."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Case, DecimalField, F, Sum, Value, When
from django.db.models.functions import Coalesce

from account.models import UserRole
from attendance.models import AttendanceDailyCheckIn
from attendance.utils_lateness import get_attendance_settings
from inventory.models import ProductionBatch
from payroll.models import EmployeeCompensation, KupasProductionRecord, PayType
from payroll.services import compute_day_pay


def _quantize(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def production_labor_for_range(start_date, end_date) -> dict:
    """
    Production labor cost accrued by ``work_date`` within [start_date, end_date].

    - Kupas (piece-rate peeling) is always direct production labor.
    - Daily wages count only for ``WAREHOUSE_STAFF``; a day is production labor
      when a ``ProductionBatch`` exists on that date, otherwise the wage is
      treated as OPEX (non-production).
    - Bonuses, advances, and late fines are excluded (labor gross only).

    Returns Decimals: ``kupas_idr``, ``daily_production_idr``,
    ``daily_nonproduction_idr``.
    """
    # Kupas: use the finalized snapshot amount when present, else kg x current rate.
    money = DecimalField(max_digits=20, decimal_places=2)
    kupas_total = KupasProductionRecord.objects.filter(
        work_date__gte=start_date, work_date__lte=end_date
    ).aggregate(
        total=Coalesce(
            Sum(
                Case(
                    When(amount_idr__gt=0, then=F("amount_idr")),
                    default=F("kg") * F("kupas_item__rate_per_kg_idr"),
                    output_field=money,
                )
            ),
            Value(Decimal("0")),
            output_field=money,
        )
    )["total"]

    # Daily wages: only warehouse staff on the daily pay scheme.
    settings = get_attendance_settings()
    rates = dict(
        EmployeeCompensation.objects.filter(
            pay_type=PayType.DAILY,
            user__is_active=True,
            user__role=UserRole.WAREHOUSE_STAFF,
        ).values_list("user_id", "daily_rate_idr")
    )
    production_dates = set(
        ProductionBatch.objects.filter(
            production_date__gte=start_date, production_date__lte=end_date
        ).values_list("production_date", flat=True)
    )

    daily_prod = Decimal("0")
    daily_nonprod = Decimal("0")
    if rates:
        rows = AttendanceDailyCheckIn.objects.filter(
            work_date__gte=start_date,
            work_date__lte=end_date,
            employee_id__in=list(rates.keys()),
        )
        for row in rows:
            daily_rate = Decimal(str(rates.get(row.employee_id) or 0))
            gross, _deduction = compute_day_pay(row, daily_rate, settings)
            if row.work_date in production_dates:
                daily_prod += gross
            else:
                daily_nonprod += gross

    return {
        "kupas_idr": _quantize(kupas_total),
        "daily_production_idr": _quantize(daily_prod),
        "daily_nonproduction_idr": _quantize(daily_nonprod),
    }
