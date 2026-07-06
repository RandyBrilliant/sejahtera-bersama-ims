"""Presensi kartu QR + pengaturan + slip gaji (model kompensasi di app payroll)."""

from __future__ import annotations

import uuid
from datetime import time
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

_DEFAULT_START = time(8, 0)
_DEFAULT_LATE_FINE_IDR = Decimal("20000")


class AttendanceSettings(models.Model):
    """
    Satu baris pengaturan (pk=1) — jam kerja & toleransi keterlambatan (Asia/Jakarta).
    """

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)
    work_start_time = models.TimeField(
        _("work start time"),
        default=_DEFAULT_START,
        help_text=_("Jam mulai efektif (zona Jakarta)."),
    )
    grace_minutes = models.PositiveSmallIntegerField(
        _("grace period (minutes)"),
        default=15,
        validators=[MinValueValidator(0)],
        help_text=_("Menit setelah jam mulai tanpa dihitung terlambat."),
    )
    minimum_hours_before_checkout = models.PositiveSmallIntegerField(
        _("minimum hours before checkout"),
        default=1,
        validators=[MinValueValidator(1)],
        help_text=_("Jam minimal antara absen masuk dan absen pulang (cegah double tap)."),
    )
    minimum_work_hours_full_day = models.PositiveSmallIntegerField(
        _("minimum work hours for full day pay"),
        default=6,
        validators=[MinValueValidator(1)],
        help_text=_("Jam kerja minimum agar gaji harian dihitung penuh."),
    )
    late_fine_idr = models.DecimalField(
        _("late fine (IDR)"),
        max_digits=14,
        decimal_places=2,
        default=_DEFAULT_LATE_FINE_IDR,
        validators=[MinValueValidator(Decimal("0"))],
        help_text=_("Potongan per hari terlambat."),
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("attendance settings")
        verbose_name_plural = _("attendance settings")

    def save(self, *args, **kwargs) -> None:
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return "Attendance settings"


class StaffAttendanceBadge(models.Model):
    """
    QR pada kartu staf menyandikan UUID ini.

    Reissue menghapus baris dan membuat baru (kartu lamanya menjadi tidak dikenali server).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_badge",
        verbose_name=_("employee"),
    )
    revoked_at = models.DateTimeField(_("revoked at"), null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("staff attendance badge")
        verbose_name_plural = _("staff attendance badges")

    def __str__(self) -> str:
        return f"{self.user_id} [{self.id}]"

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None


class AttendanceDailyCheckIn(models.Model):
    """
    Satu catatan harian per karyawan per tanggal kalender Jakarta: masuk (wajib) & pulang (opsional).

    Datang pada hari pertama sebelum cutoff “mulai efektif + toleransi”: tidak terlambat.
    """

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="attendance_daily_checkins",
        verbose_name=_("employee"),
        db_index=True,
    )
    work_date = models.DateField(_("work date"), db_index=True)
    checked_in_at = models.DateTimeField(_("checked in at"))
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="+",
        verbose_name=_("verified by"),
    )

    checked_out_at = models.DateTimeField(_("checked out at"), null=True, blank=True)
    verified_out_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="+",
        verbose_name=_("verified out by"),
        null=True,
        blank=True,
    )

    is_late = models.BooleanField(_("is late"), default=False, db_index=True)
    minutes_late = models.PositiveSmallIntegerField(
        _("minutes late"),
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text=_("Hanya untuk hari baru setelah cutoff toleransi."),
    )
    paid_in_period = models.ForeignKey(
        "payroll.PayrollPeriod",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="attendance_records_paid",
        verbose_name=_("paid in period"),
        db_index=True,
        help_text=_("Diisi saat periode gaji difinalisasi."),
    )

    class Meta:
        verbose_name = _("attendance daily check-in")
        verbose_name_plural = _("attendance daily check-ins")
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "work_date"],
                name="uniq_attendance_checkin_employee_work_date",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.employee_id} @{self.work_date}"
