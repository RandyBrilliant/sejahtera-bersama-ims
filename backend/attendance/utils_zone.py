"""Zona kalender Jakarta untuk presensi harian."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.utils import timezone

JAKARTA = ZoneInfo("Asia/Jakarta")


def jakarta_now_local() -> datetime:
    """Waktu kini dalam zona Asia/Jakarta."""

    return timezone.now().astimezone(JAKARTA)


def jakarta_today_date() -> date:
    """Tanggal kalender Jakarta hari ini."""

    return jakarta_now_local().date()
