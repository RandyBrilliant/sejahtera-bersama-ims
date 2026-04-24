from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

from .managers import CustomUserManager


class UserRole(models.TextChoices):
    """System roles mapped to planned IMS user types."""

    ADMIN = "ADMIN", _("Admin")
    WAREHOUSE_STAFF = "WAREHOUSE_STAFF", _("Staff Gudang")
    SALES_STAFF = "SALES_STAFF", _("Staff Sales")
    FINANCE_STAFF = "FINANCE_STAFF", _("Staff Keuangan")
    LEADERSHIP = "LEADERSHIP", _("Pimpinan")


class CustomUser(AbstractUser):
    """
    Primary user model for IMS.

    Uses username as the login identifier and stores app-level role for RBAC.
    """

    first_name = None
    last_name = None

    full_name = models.CharField(_("full name"), max_length=255)
    role = models.CharField(
        _("role"),
        max_length=32,
        choices=UserRole.choices,
        default=UserRole.WAREHOUSE_STAFF,
        db_index=True,
    )
    phone_number = models.CharField(_("phone number"), max_length=50, blank=True)
    is_active = models.BooleanField(_("active"), default=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["full_name"]

    objects = CustomUserManager()

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        ordering = ["username"]
        indexes = [
            models.Index(fields=["role", "is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} ({self.username})"

    @property
    def is_admin_role(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def is_warehouse_staff(self) -> bool:
        return self.role == UserRole.WAREHOUSE_STAFF

    @property
    def is_finance_staff(self) -> bool:
        return self.role == UserRole.FINANCE_STAFF

    @property
    def is_sales_staff(self) -> bool:
        return self.role == UserRole.SALES_STAFF

    @property
    def is_leadership(self) -> bool:
        return self.role == UserRole.LEADERSHIP

    @property
    def is_owner(self) -> bool:
        """Alias: leadership acts as system owner."""
        return self.role == UserRole.LEADERSHIP


class EmployeeProfile(models.Model):
    """Additional employee metadata for attendance and HR reports."""

    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="employee_profile",
        verbose_name=_("user"),
    )
    employee_code = models.CharField(_("employee code"), max_length=30, unique=True)
    joined_date = models.DateField(_("joined date"), null=True, blank=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("employee profile")
        verbose_name_plural = _("employee profiles")
        ordering = ["employee_code"]
        indexes = [
            models.Index(fields=["employee_code"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee_code} - {self.user.full_name}"

    @staticmethod
    def role_code_prefix(role: str) -> str:
        prefix_map = {
            UserRole.ADMIN: "ADM",
            UserRole.WAREHOUSE_STAFF: "WH",
            UserRole.SALES_STAFF: "SAL",
            UserRole.FINANCE_STAFF: "FIN",
            UserRole.LEADERSHIP: "LDR",
        }
        return prefix_map.get(role, "EMP")

    @classmethod
    def generate_employee_code(cls, role: str) -> str:
        prefix = cls.role_code_prefix(role)
        sequence = 1

        while True:
            candidate = f"{prefix}-{sequence:04d}"
            if not cls.objects.filter(employee_code=candidate).exists():
                return candidate
            sequence += 1

    def save(self, *args, **kwargs):
        if not self.employee_code:
            self.employee_code = self.generate_employee_code(self.user.role)
        super().save(*args, **kwargs)