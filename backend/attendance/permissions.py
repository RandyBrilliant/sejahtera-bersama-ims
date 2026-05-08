from rest_framework import permissions

from account.models import UserRole
from account.permissions import has_role


class AttendanceVerifierAccess(permissions.BasePermission):
    """
    Pemindaian & konfirmasi presensi kartu QR hanya ADMIN / Pemilik.
    """

    message = "Anda tidak memiliki izin mengonfirmasi presensi."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role(request.user, UserRole.ADMIN, UserRole.LEADERSHIP)


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
