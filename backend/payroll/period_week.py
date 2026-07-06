"""Rentang minggu kerja gaji — dibayar setiap Sabtu."""

from __future__ import annotations

from datetime import date, timedelta


class PayrollPeriodError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def is_saturday(value: date) -> bool:
    return value.weekday() == 5


def week_bounds_for_pay_saturday(pay_saturday: date) -> tuple[date, date]:
    """
    Minggu kerja Senin–Sabtu; `pay_saturday` adalah hari pembayaran sekaligus akhir periode.
    """
    if not is_saturday(pay_saturday):
        raise PayrollPeriodError("Tanggal pembayaran harus hari Sabtu.")
    period_end = pay_saturday
    period_start = pay_saturday - timedelta(days=5)
    return period_start, period_end


def default_upcoming_pay_saturday(*, today: date | None = None) -> date:
    """Sabtu pembayaran berikutnya (hari ini jika Sabtu)."""
    today = today or date.today()
    days_ahead = (5 - today.weekday()) % 7
    return today + timedelta(days=days_ahead)
