"""Rentang periode gaji — mingguan (Minggu–Sabtu) atau bulanan."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta

from payroll.models import PayCadence


class PayrollPeriodError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def is_saturday(value: date) -> bool:
    return value.weekday() == 5


def is_sunday(value: date) -> bool:
    return value.weekday() == 6


def week_bounds_for_pay_saturday(pay_saturday: date) -> tuple[date, date]:
    """
    Minggu kerja Minggu–Sabtu; `pay_saturday` adalah hari pembayaran sekaligus akhir periode.
    Minggu dihitung sebagai hari kerja tambahan (tarif sama).
    """
    if not is_saturday(pay_saturday):
        raise PayrollPeriodError("Tanggal pembayaran periode mingguan harus hari Sabtu.")
    period_end = pay_saturday
    period_start = pay_saturday - timedelta(days=6)  # Sunday
    return period_start, period_end


def month_bounds_for_pay_date(pay_date: date, cutoff_date: date | None = None) -> tuple[date, date]:
    """Default: first–last day of the month containing pay_date (or explicit cutoff)."""
    if cutoff_date is not None:
        if cutoff_date > pay_date:
            raise PayrollPeriodError("Cutoff tidak boleh setelah tanggal pembayaran.")
        period_end = cutoff_date
        period_start = date(period_end.year, period_end.month, 1)
        return period_start, period_end

    period_start = date(pay_date.year, pay_date.month, 1)
    last_day = monthrange(pay_date.year, pay_date.month)[1]
    period_end = date(pay_date.year, pay_date.month, last_day)
    return period_start, period_end


def default_bounds_for_pay_date(
    pay_date: date,
    cutoff_date: date | None = None,
    *,
    cadence: str = PayCadence.WEEKLY,
) -> tuple[date, date]:
    """
    Default period bounds when creating a period.

    WEEKLY: Sunday–Saturday ending on pay_date (must be Saturday unless cutoff given).
    MONTHLY: calendar month of pay_date (or month of cutoff).
    """
    if cadence == PayCadence.MONTHLY:
        return month_bounds_for_pay_date(pay_date, cutoff_date)

    if cutoff_date is not None:
        if cutoff_date > pay_date:
            raise PayrollPeriodError("Cutoff tidak boleh setelah tanggal pembayaran.")
        period_end = cutoff_date
        period_start = cutoff_date - timedelta(days=6)
        return period_start, period_end

    if is_saturday(pay_date):
        return week_bounds_for_pay_saturday(pay_date)

    period_end = pay_date
    period_start = pay_date - timedelta(days=6)
    return period_start, period_end


def default_upcoming_pay_saturday(*, today: date | None = None) -> date:
    """Sabtu pembayaran berikutnya (hari ini jika Sabtu)."""
    today = today or date.today()
    days_ahead = (5 - today.weekday()) % 7
    return today + timedelta(days=days_ahead)


def default_cadence_for_role(role: str) -> str:
    """WAREHOUSE_STAFF / KUPAS_STAFF → WEEKLY; others → MONTHLY."""
    from account.models import UserRole

    if role in (UserRole.WAREHOUSE_STAFF, UserRole.KUPAS_STAFF):
        return PayCadence.WEEKLY
    return PayCadence.MONTHLY
