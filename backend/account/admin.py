from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import CustomUser, EmployeeProfile


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    """
    Admin configuration for IMS user accounts.
    Enforces soft-deactivation workflow by disabling hard delete.
    """

    list_display = (
        "username",
        "full_name",
        "role",
        "is_active",
        "is_staff",
        "is_superuser",
        "date_joined",
    )
    list_filter = ("role", "is_active", "is_staff", "is_superuser", "date_joined")
    search_fields = ("username", "full_name", "phone_number")
    ordering = ("username",)
    readonly_fields = ("date_joined", "last_login", "created_at", "updated_at")

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            _("Personal info"),
            {"fields": ("full_name", "phone_number")},
        ),
        (
            _("Access"),
            {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        (
            _("Important dates"),
            {"fields": ("last_login", "date_joined", "created_at", "updated_at")},
        ),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("username", "full_name", "role", "phone_number", "password1", "password2"),
            },
        ),
    )

    actions = ("activate_users", "deactivate_users")

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        queryset.update(is_active=False)

    def has_delete_permission(self, request, obj=None):
        # No hard delete in IMS account module.
        return False


@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    """
    Admin configuration for employee profile records.
    """

    list_display = ("employee_code", "user", "joined_date", "created_at")
    list_filter = ("joined_date", "created_at", "updated_at")
    search_fields = ("employee_code", "user__username", "user__full_name")
    raw_id_fields = ("user",)
    readonly_fields = ("employee_code", "created_at", "updated_at")
    ordering = ("employee_code",)

    fieldsets = (
        (_("Employee"), {"fields": ("user", "employee_code", "joined_date")}),
        (_("Timestamps"), {"fields": ("created_at", "updated_at")}),
    )

    def has_delete_permission(self, request, obj=None):
        # No hard delete in IMS account module.
        return False
