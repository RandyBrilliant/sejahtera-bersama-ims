from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

User = settings.AUTH_USER_MODEL


class EmployeeCompensation(models.Model):
    """Gaji pokok bulanan pegawai."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="payroll_compensation",
        verbose_name=_("employee"),
    )
    monthly_base_salary_idr = models.DecimalField(
        _("monthly base salary (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("employee compensation")

    def __str__(self) -> str:
        return f"{self.user_id} @{self.monthly_base_salary_idr}"


class PayrollPeriod(models.Model):
    """Satu periode gaji mingguan — dibayar setiap Sabtu (Senin–Sabtu)."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        FINALIZED = "FINALIZED", _("Final")

    pay_date = models.DateField(_("pay date (Saturday)"), db_index=True)
    period_start_date = models.DateField(_("period start (Monday)"))
    period_end_date = models.DateField(_("period end (Saturday)"))
    status = models.CharField(_("status"), max_length=16, choices=Status.choices, default=Status.DRAFT, db_index=True)
    finalized_at = models.DateTimeField(null=True, blank=True)
    finalized_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("finalized by"),
    )
    notes = models.TextField(_("notes"), blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("payroll period")
        verbose_name_plural = _("payroll periods")
        constraints = [
            models.UniqueConstraint(fields=("pay_date",), name="uniq_payroll_pay_date"),
        ]
        ordering = ["-pay_date"]

    def __str__(self) -> str:
        return f"{self.pay_date.isoformat()} [{self.status}]"


class PayrollEntry(models.Model):
    """Slip satu pegawai dalam satu periode (snapshot saat generate / penyusunan)."""

    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.CASCADE,
        related_name="entries",
        verbose_name=_("period"),
    )
    employee = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="payroll_entries",
        verbose_name=_("employee"),
        db_index=True,
    )

    base_salary_snapshot_idr = models.DecimalField(
        _("base salary snapshot (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
    )
    days_present = models.PositiveIntegerField(_("days present"), default=0)
    late_count = models.PositiveIntegerField(_("late count"), default=0)
    deductions_idr = models.DecimalField(
        _("deductions (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
    )
    net_pay_idr = models.DecimalField(
        _("net pay (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
    )
    notes = models.TextField(_("notes"), blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("payroll entry")
        verbose_name_plural = _("payroll entries")
        constraints = [
            models.UniqueConstraint(fields=("period", "employee"), name="uniq_payroll_entry_period_employee"),
        ]
        ordering = ["employee__full_name"]

    def __str__(self) -> str:
        return f"{self.period_id}:{self.employee_id}"
