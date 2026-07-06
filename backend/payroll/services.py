"""Generate & finalisasi periode gaji mingguan (dibayar Sabtu) dari presensi."""

from __future__ import annotations

from calendar import monthrange
from decimal import ROUND_HALF_UP, Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from attendance.services import work_hours_between
from attendance.utils_lateness import get_attendance_settings
from payroll.models import EmployeeCompensation, PayrollEntry, PayrollPeriod

User = get_user_model()


class PayrollWorkflowError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def _quantize_idr(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def period_attendance_bounds(period: PayrollPeriod) -> tuple:
    return period.period_start_date, period.period_end_date


def compute_day_pay(row, daily_rate: Decimal, settings) -> tuple[Decimal, Decimal]:
    """Return (gross_for_day, deductions_for_day)."""
    gross = daily_rate
    deduction = Decimal("0")

    hours = work_hours_between(row.checked_in_at, row.checked_out_at)
    if hours is None or hours < settings.minimum_work_hours_full_day:
        gross = _quantize_idr(daily_rate / Decimal("2"))

    if row.is_late:
        deduction += settings.late_fine_idr

    return gross, deduction


@transaction.atomic
def generate_payroll_entries(period: PayrollPeriod) -> int:
    if period.status != PayrollPeriod.Status.DRAFT:
        raise PayrollWorkflowError("Hanya periode DRAFT yang dapat dihasilkan ulang.")

    from attendance.models import AttendanceDailyCheckIn

    first, last = period_attendance_bounds(period)
    days_in_month = monthrange(period.pay_date.year, period.pay_date.month)[1]
    settings = get_attendance_settings()
    PayrollEntry.objects.filter(period=period).delete()

    count = 0
    comps = EmployeeCompensation.objects.select_related("user").filter(user__is_active=True)
    for c in comps:
        rows = list(
            AttendanceDailyCheckIn.objects.filter(
                employee_id=c.user_id,
                work_date__gte=first,
                work_date__lte=last,
            )
        )
        days_present = len(rows)
        late_count = sum(1 for row in rows if row.is_late)
        base = c.monthly_base_salary_idr
        daily_rate = (
            _quantize_idr(base / Decimal(days_in_month)) if days_in_month else Decimal("0")
        )

        gross_total = Decimal("0")
        deductions = Decimal("0")
        for row in rows:
            day_gross, day_deduction = compute_day_pay(row, daily_rate, settings)
            gross_total += day_gross
            deductions += day_deduction

        net_pay = gross_total - deductions
        if net_pay < 0:
            net_pay = Decimal("0")

        PayrollEntry.objects.create(
            period=period,
            employee_id=c.user_id,
            base_salary_snapshot_idr=base,
            days_present=days_present,
            late_count=late_count,
            deductions_idr=_quantize_idr(deductions),
            net_pay_idr=_quantize_idr(net_pay),
        )
        count += 1
    period.save(update_fields=["updated_at"])
    return count


@transaction.atomic
def finalize_payroll_period(period: PayrollPeriod, finalized_by_user_id: int) -> PayrollPeriod:
    if period.status == PayrollPeriod.Status.FINALIZED:
        raise PayrollWorkflowError("Periode sudah dikunci.")

    entries = PayrollEntry.objects.filter(period=period).count()
    if entries == 0:
        raise PayrollWorkflowError("Belum ada entri payroll. Jalankan Generate terlebih dahulu.")

    period.status = PayrollPeriod.Status.FINALIZED
    period.finalized_at = timezone.now()
    period.finalized_by_id = finalized_by_user_id
    period.save(update_fields=["status", "finalized_at", "finalized_by_id", "updated_at"])
    return period
