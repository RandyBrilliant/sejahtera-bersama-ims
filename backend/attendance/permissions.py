from django.conf import settings
from rest_framework import permissions

from account.models import UserRole
from account.permissions import has_role

KIOSK_HEADER = "HTTP_X_ATTENDANCE_KIOSK_KEY"


class AttendanceVerifierAccess(permissions.BasePermission):
    """
    Pemindaian & konfirmasi presensi kartu QR hanya ADMIN / Pemilik.
    """

    message = "Anda tidak memiliki izin mengonfirmasi presensi."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role(request.user, UserRole.ADMIN, UserRole.LEADERSHIP)


class AttendanceScannerAccess(permissions.BasePermission):
    """
    Pemindai presensi (login): semua staf yang bisa masuk aplikasi.

    Pemindai tercatat sebagai verifikator (``verified_by`` / ``verified_out_by``).
    Staf kupas tidak punya akses aplikasi sehingga tidak termasuk.
    """

    message = "Anda tidak memiliki izin memindai presensi."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role(
            request.user,
            UserRole.ADMIN,
            UserRole.LEADERSHIP,
            UserRole.WAREHOUSE_STAFF,
            UserRole.SALES_STAFF,
            UserRole.FINANCE_STAFF,
        )


def can_scan_own_badge(user) -> bool:
    """Admin / pemilik boleh memindai kartu sendiri; staf lain harus dipindai rekan."""
    return has_role(user, UserRole.ADMIN, UserRole.LEADERSHIP)


class AttendanceKioskAccess(permissions.BasePermission):
    """
    Public QR kiosk: open by default.

    If ATTENDANCE_KIOSK_SECRET is set, require matching X-Attendance-Kiosk-Key header.
    """

    message = "Kunci kiosk tidak valid."

    def has_permission(self, request, view) -> bool:
        expected = (getattr(settings, "ATTENDANCE_KIOSK_SECRET", "") or "").strip()
        if not expected:
            return True
        provided = (request.META.get(KIOSK_HEADER) or "").strip()
        return bool(provided) and provided == expected


class AttendanceSettingsAccess(permissions.BasePermission):
    """Pengaturan jam & toleransi terlambat: ADMIN / Pemilik."""

    message = "Anda tidak memiliki izin mengubah pengaturan presensi."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role(request.user, UserRole.ADMIN, UserRole.LEADERSHIP)


class AttendanceReportAccess(permissions.BasePermission):
    """Laporan agregat presensi: admin, pemilik, keuangan."""

    message = "Anda tidak memiliki izin melihat laporan presensi."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role(
            request.user,
            UserRole.ADMIN,
            UserRole.LEADERSHIP,
            UserRole.FINANCE_STAFF,
        )
