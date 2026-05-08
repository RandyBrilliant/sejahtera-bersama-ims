"""Generate & finalisasi periode gaji dari presensi."""

from __future__ import annotations

from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from payroll.models import EmployeeCompensation, PayrollEntry, PayrollPeriod

User = get_user_model()


class PayrollWorkflowError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def month_date_bounds(year: int, month: int) -> tuple[date, date]:
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


@transaction.atomic
def generate_payroll_entries(period: PayrollPeriod) -> int:
    if period.status != PayrollPeriod.Status.DRAFT:
        raise PayrollWorkflowError("Hanya periode DRAFT yang dapat dihasilkan ulang.")

    from attendance.models import AttendanceDailyCheckIn

    first, last = month_date_bounds(int(period.year), int(period.month))
    PayrollEntry.objects.filter(period=period).delete()

    count = 0
    comps = EmployeeCompensation.objects.select_related("user").filter(user__is_active=True)
    for c in comps:
        qs = AttendanceDailyCheckIn.objects.filter(
            employee_id=c.user_id,
            work_date__gte=first,
            work_date__lte=last,
        )
        days_present = qs.count()
        late_count = qs.filter(is_late=True).count()
        base = c.monthly_base_salary_idr
        deductions = Decimal("0")
        net_pay = base - deductions
        if net_pay < 0:
            net_pay = Decimal("0")
        PayrollEntry.objects.create(
            period=period,
            employee_id=c.user_id,
            base_salary_snapshot_idr=base,
            days_present=days_present,
            late_count=late_count,
            deductions_idr=deductions,
            net_pay_idr=net_pay,
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
