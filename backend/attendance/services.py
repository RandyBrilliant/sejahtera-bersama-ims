"""Logika presensi harian Jakarta + badge + pengaturan."""

from __future__ import annotations

import uuid
from datetime import datetime

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.utils import timezone

from attendance.models import AttendanceDailyCheckIn, StaffAttendanceBadge
from attendance.utils_lateness import compute_lateness_for_check_in
from attendance.utils_zone import jakarta_today_date

User = get_user_model()


class AttendanceError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


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
    if checked is not None:
        if checked.checked_out_at is None:
            suggested_intent = "check_out"
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
        return existing, False


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
        return rec, False

    now = timezone.now()
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
