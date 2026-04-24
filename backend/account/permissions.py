"""
Permissions for account and module APIs.

Access policy:
- LEADERSHIP is the owner role with full control.
- Other roles are operational staff with module-based access.
"""
from rest_framework import permissions

from .api_responses import ApiMessage
from .models import UserRole


def is_authenticated(user) -> bool:
    return bool(user and user.is_authenticated)


def user_is_owner(user) -> bool:
    """Owner has full control (leadership or superuser)."""
    if not is_authenticated(user):
        return False
    return user.is_superuser or user.role == UserRole.LEADERSHIP


def has_role(user, *roles: str) -> bool:
    """
    Role checker with owner bypass.
    Owner always passes all role checks.
    """
    if not is_authenticated(user):
        return False
    if user_is_owner(user):
        return True
    return user.role in roles


class IsOwner(permissions.BasePermission):
    """Owner-only permission (leadership or superuser)."""

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        return user_is_owner(request.user)


class IsBackofficeUser(permissions.BasePermission):
    """Any authenticated internal user."""

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        return is_authenticated(request.user)


class IsWarehouseTeam(permissions.BasePermission):
    """Owner/Admin/Warehouse."""

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        return has_role(request.user, UserRole.ADMIN, UserRole.WAREHOUSE_STAFF)


class IsSalesTeam(permissions.BasePermission):
    """Owner/Admin/Sales."""

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        return has_role(request.user, UserRole.ADMIN, UserRole.SALES_STAFF)


class IsFinanceTeam(permissions.BasePermission):
    """Owner/Admin/Finance."""

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        return has_role(request.user, UserRole.ADMIN, UserRole.FINANCE_STAFF)


class IsAdminOrOwner(permissions.BasePermission):
    """Admin or owner."""

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        return has_role(request.user, UserRole.ADMIN)


class StaffReadOnlyWriteForOwner(permissions.BasePermission):
    """
    Owner can write; staff can only read.
    Useful for sensitive endpoints.
    """

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        if not is_authenticated(request.user):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return user_is_owner(request.user)


class InventoryAccess(permissions.BasePermission):
    """
    Inventory policy:
    - Owner/Admin/Warehouse: write
    - Finance/Sales: read
    """

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        if not is_authenticated(request.user):
            return False

        if request.method in permissions.SAFE_METHODS:
            return has_role(
                request.user,
                UserRole.ADMIN,
                UserRole.WAREHOUSE_STAFF,
                UserRole.FINANCE_STAFF,
                UserRole.SALES_STAFF,
            )
        return has_role(request.user, UserRole.ADMIN, UserRole.WAREHOUSE_STAFF)


class FinanceAccess(permissions.BasePermission):
    """
    Finance policy:
    - Owner/Admin/Finance: write
    - Warehouse/Sales: read
    """

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        if not is_authenticated(request.user):
            return False

        if request.method in permissions.SAFE_METHODS:
            return has_role(
                request.user,
                UserRole.ADMIN,
                UserRole.FINANCE_STAFF,
                UserRole.WAREHOUSE_STAFF,
                UserRole.SALES_STAFF,
            )
        return has_role(request.user, UserRole.ADMIN, UserRole.FINANCE_STAFF)


class SalesAccess(permissions.BasePermission):
    """
    Sales policy:
    - Owner/Admin/Sales: write
    - Warehouse/Finance: read
    """

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        if not is_authenticated(request.user):
            return False

        if request.method in permissions.SAFE_METHODS:
            return has_role(
                request.user,
                UserRole.ADMIN,
                UserRole.SALES_STAFF,
                UserRole.WAREHOUSE_STAFF,
                UserRole.FINANCE_STAFF,
            )
        return has_role(request.user, UserRole.ADMIN, UserRole.SALES_STAFF)


class CustomerAccess(permissions.BasePermission):
    """
    Customer master data:
    - Read: all internal roles + owner
    - Write (create/update): Sales/Admin/Owner
    - Delete: Admin/Owner only
    """

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        if not is_authenticated(request.user):
            return False
        if request.method in permissions.SAFE_METHODS:
            return has_role(
                request.user,
                UserRole.ADMIN,
                UserRole.SALES_STAFF,
                UserRole.WAREHOUSE_STAFF,
                UserRole.FINANCE_STAFF,
            )
        if request.method == "DELETE":
            return has_role(request.user, UserRole.ADMIN)
        return has_role(request.user, UserRole.ADMIN, UserRole.SALES_STAFF)


class CustomerSpecialPriceAccess(permissions.BasePermission):
    """
    Per-customer product selling prices (admin special pricing):
    - Read: all internal roles + owner
    - Write: Admin/Owner only
    """

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        if not is_authenticated(request.user):
            return False
        if request.method in permissions.SAFE_METHODS:
            return has_role(
                request.user,
                UserRole.ADMIN,
                UserRole.SALES_STAFF,
                UserRole.WAREHOUSE_STAFF,
                UserRole.FINANCE_STAFF,
            )
        return has_role(request.user, UserRole.ADMIN)


class PurchaseInOrderAccess(permissions.BasePermission):
    """
    Ingredient procurement (order in):
    - Read: all internal roles + owner
    - Write: Warehouse/Admin/Owner
    """

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        if not is_authenticated(request.user):
            return False
        if request.method in permissions.SAFE_METHODS:
            return has_role(
                request.user,
                UserRole.ADMIN,
                UserRole.SALES_STAFF,
                UserRole.WAREHOUSE_STAFF,
                UserRole.FINANCE_STAFF,
            )
        return has_role(request.user, UserRole.ADMIN, UserRole.WAREHOUSE_STAFF)


class SalesOrderAccess(permissions.BasePermission):
    """
    Customer sales order (order out):
    - Read: all internal roles + owner
    - Write: Sales/Admin/Owner
    """

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        if not is_authenticated(request.user):
            return False
        if request.method in permissions.SAFE_METHODS:
            return has_role(
                request.user,
                UserRole.ADMIN,
                UserRole.SALES_STAFF,
                UserRole.WAREHOUSE_STAFF,
                UserRole.FINANCE_STAFF,
            )
        return has_role(request.user, UserRole.ADMIN, UserRole.SALES_STAFF)


class SalesRevenueReportAccess(permissions.BasePermission):
    """
    Verified sales revenue reports:
    - Finance, Admin, Owner (and superuser) only.
    """

    message = ApiMessage.PERMISSION_DENIED

    def has_permission(self, request, view):
        if not is_authenticated(request.user):
            return False
        return has_role(request.user, UserRole.ADMIN, UserRole.FINANCE_STAFF) or user_is_owner(request.user)
