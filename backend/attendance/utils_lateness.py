"""Hitung status terlambatan berbasis jam Jakarta + pengaturan org."""

from __future__ import annotations

from datetime import datetime, timedelta

from django.utils import timezone
from zoneinfo import ZoneInfo

from attendance.models import AttendanceSettings

JAKARTA = ZoneInfo("Asia/Jakarta")


def get_attendance_settings() -> AttendanceSettings:
    return AttendanceSettings.objects.get_or_create(pk=1, defaults={})[0]


def compute_lateness_for_check_in(
    checked_in_at_aware_utc,
    work_date,
    *,
    start_time=None,
    grace_minutes: int | None = None,
) -> tuple[bool, int]:
    """
    Mengembalikan (is_late, minutes_late). minutes_late 0 jika tidak terlambat.
    """
    if start_time is None or grace_minutes is None:
        s = get_attendance_settings()
        if start_time is None:
            start_time = s.work_start_time
        if grace_minutes is None:
            grace_minutes = s.grace_minutes

    ck = checked_in_at_aware_utc
    if timezone.is_naive(ck):
        ck = timezone.make_aware(ck, timezone=timezone.utc)
    local_in = ck.astimezone(JAKARTA)

    deadline = datetime.combine(work_date, start_time, tzinfo=JAKARTA) + timedelta(
        minutes=int(grace_minutes)
    )

    if local_in <= deadline:
        return False, 0

    delta = local_in - deadline
    mins = max(0, int(delta.total_seconds() // 60))
    return True, mins
