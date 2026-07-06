"""Logika presensi harian Jakarta + badge + pengaturan."""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from attendance.models import AttendanceDailyCheckIn, AttendanceSettings, StaffAttendanceBadge
from attendance.utils_lateness import compute_lateness_for_check_in, get_attendance_settings
from attendance.utils_zone import jakarta_today_date

User = get_user_model()


class AttendanceError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


def _fmt_local_time(dt: datetime) -> str:
    ck = dt
    if timezone.is_naive(ck):
        ck = timezone.make_aware(ck, timezone=timezone.utc)
    return ck.astimezone().strftime("%H:%M")


def checkout_availability(
    checked_in_at: datetime,
    *,
    settings: AttendanceSettings | None = None,
    now: datetime | None = None,
) -> tuple[bool, str | None, datetime | None]:
    """Return (can_check_out, blocked_reason, available_at)."""
    settings = settings or get_attendance_settings()
    now = now or timezone.now()
    min_delta = timedelta(hours=int(settings.minimum_hours_before_checkout))
    available_at = checked_in_at + min_delta
    if now >= available_at:
        return True, None, available_at
    remaining_mins = max(1, math.ceil((available_at - now).total_seconds() / 60))
    reason = (
        f"Sudah absen masuk pukul {_fmt_local_time(checked_in_at)}. "
        f"Pulang dapat dilakukan minimal {settings.minimum_hours_before_checkout} jam "
        f"setelah masuk (~{remaining_mins} menit lagi)."
    )
    return False, reason, available_at


def work_hours_between(checked_in_at: datetime, checked_out_at: datetime | None) -> float | None:
    if checked_out_at is None:
        return None
    return (checked_out_at - checked_in_at).total_seconds() / 3600


def resolve_employee_from_badge_token(token: uuid.UUID) -> StaffAttendanceBadge:
    try:
        badge = StaffAttendanceBadge.objects.select_related(
            "user",
            "user__employee_profile",
        ).get(pk=token)
    except StaffAttendanceBadge.DoesNotExist as exc:
        raise AttendanceError("Kartu tidak dikenali atau sudah dicabut.") from exc

    if badge.revoked_at is not None:
        raise AttendanceError("Kartu ini sudah tidak berlaku (dicabut).")

    if not badge.user.is_active:
        raise AttendanceError("Akun pegawai tidak aktif.")

    return badge


def build_tablet_preview(badge: StaffAttendanceBadge, today_work_date_jakarta) -> dict:
    emp = badge.user
    profile = getattr(emp, "employee_profile", None)
    employee_code = profile.employee_code if profile else ""
    checked = AttendanceDailyCheckIn.objects.filter(
        employee_id=emp.id,
        work_date=today_work_date_jakarta,
    ).first()

    suggested_intent = "check_in"
    can_check_out = False
    checkout_blocked_reason = None
    checkout_available_at = None

    if checked is not None:
        if checked.checked_out_at is None:
            suggested_intent = "check_out"
            can_check_out, checkout_blocked_reason, checkout_available_at = checkout_availability(
                checked.checked_in_at
            )
        else:
            suggested_intent = "done"

    return {
        "user_id": emp.id,
        "username": emp.username,
        "full_name": emp.full_name,
        "role": emp.role,
        "employee_code": employee_code,
        "already_checked_in_today": checked is not None,
        "checked_in_at": checked.checked_in_at.isoformat() if checked else None,
        "is_late": checked.is_late if checked else None,
        "minutes_late": checked.minutes_late if checked else None,
        "already_checked_out_today": bool(checked.checked_out_at) if checked else False,
        "checked_out_at": checked.checked_out_at.isoformat()
        if checked and checked.checked_out_at
        else None,
        "suggested_intent": suggested_intent,
        "can_check_out": can_check_out,
        "checkout_blocked_reason": checkout_blocked_reason,
        "checkout_available_at": checkout_available_at.isoformat() if checkout_available_at else None,
    }


@transaction.atomic
def confirm_check_in(badge_token: uuid.UUID, verifier_id: int) -> tuple[AttendanceDailyCheckIn, bool]:
    """Mencatat masuk baru; menghitung keterlambatan (Jakarta)."""

    badge = resolve_employee_from_badge_token(badge_token)
    emp = badge.user
    wd = jakarta_today_date()
    checked_at = timezone.now()
    late, mins = compute_lateness_for_check_in(checked_at, wd)

    try:
        row = AttendanceDailyCheckIn.objects.create(
            employee_id=emp.id,
            work_date=wd,
            checked_in_at=checked_at,
            verified_by_id=verifier_id,
            checked_out_at=None,
            verified_out_by_id=None,
            is_late=late,
            minutes_late=mins if late else 0,
        )
        return row, True
    except IntegrityError:
        existing = AttendanceDailyCheckIn.objects.get(employee_id=emp.id, work_date=wd)
        raise AttendanceError(
            f"{emp.full_name} sudah tercatat masuk hari ini pukul "
            f"{_fmt_local_time(existing.checked_in_at)}."
        ) from None


@transaction.atomic
def confirm_check_out(badge_token: uuid.UUID, verifier_id: int) -> tuple[AttendanceDailyCheckIn, bool]:
    """Mencatat pulang untuk hari Jakarta yang sama."""

    badge = resolve_employee_from_badge_token(badge_token)
    emp = badge.user
    wd = jakarta_today_date()

    rec = AttendanceDailyCheckIn.objects.select_for_update().filter(
        employee_id=emp.id,
        work_date=wd,
    ).first()

    if rec is None:
        raise AttendanceError("Belum ada presensi masuk untuk hari ini.")

    if rec.checked_out_at is not None:
        raise AttendanceError(
            f"{emp.full_name} sudah tercatat pulang hari ini pukul "
            f"{_fmt_local_time(rec.checked_out_at)}."
        )

    now = timezone.now()
    can_check_out, blocked_reason, _ = checkout_availability(rec.checked_in_at, now=now)
    if not can_check_out:
        raise AttendanceError(blocked_reason or "Belum dapat absen pulang.")

    rec.checked_out_at = now
    rec.verified_out_by_id = verifier_id
    rec.save(update_fields=["checked_out_at", "verified_out_by_id"])
    return rec, True


def revoke_badge(user_id: int, *, at: datetime | None = None) -> StaffAttendanceBadge:
    badge = StaffAttendanceBadge.objects.filter(user_id=user_id).first()
    if badge is None:
        raise AttendanceError("Badge presensi tidak ditemukan.")
    badge.revoked_at = at or timezone.now()
    badge.save(update_fields=["revoked_at", "updated_at"])
    return badge


def unrevoke_badge(user_id: int) -> StaffAttendanceBadge:
    badge = StaffAttendanceBadge.objects.filter(user_id=user_id).first()
    if badge is None:
        raise AttendanceError("Badge presensi tidak ditemukan.")
    badge.revoked_at = None
    badge.save(update_fields=["revoked_at", "updated_at"])
    return badge


@transaction.atomic
def reissue_badge(user_id: int) -> StaffAttendanceBadge:
    StaffAttendanceBadge.objects.filter(user_id=user_id).delete()
    return StaffAttendanceBadge.objects.create(user_id=user_id)
