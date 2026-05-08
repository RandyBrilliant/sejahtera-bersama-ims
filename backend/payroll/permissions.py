from rest_framework import permissions

from account.models import UserRole
from account.permissions import has_role


class PayrollManageAccess(permissions.BasePermission):
    """Manajemen upah & pembuatan periode slip: ADMIN / Pemilik / Keuangan."""

    message = "Anda tidak memiliki izin akses penggajian."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role(
            request.user,
            UserRole.ADMIN,
            UserRole.LEADERSHIP,
            UserRole.FINANCE_STAFF,
        )


class PayrollFinalizeAccess(permissions.BasePermission):
    """Finalisasi periode (immutable): ADMIN / Pemilik."""

    message = "Hanya pemilik atau admin yang dapat mengunci periode gaji."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return has_role(request.user, UserRole.ADMIN, UserRole.LEADERSHIP)
