from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

User = settings.AUTH_USER_MODEL


class PayType(models.TextChoices):
    DAILY = "DAILY", _("Daily wage (attendance)")
    PIECE_RATE = "PIECE_RATE", _("Piece rate (kupas)")


class PayCadence(models.TextChoices):
    WEEKLY = "WEEKLY", _("Weekly")
    MONTHLY = "MONTHLY", _("Monthly")


class EmployeeCompensation(models.Model):
    """Kompensasi pegawai — harian (presensi) atau borongan kupas."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="payroll_compensation",
        verbose_name=_("employee"),
    )
    pay_type = models.CharField(
        _("pay type"),
        max_length=16,
        choices=PayType.choices,
        default=PayType.DAILY,
        db_index=True,
    )
    pay_cadence = models.CharField(
        _("pay cadence"),
        max_length=16,
        choices=PayCadence.choices,
        default=PayCadence.MONTHLY,
        db_index=True,
        help_text=_("Mingguan atau bulanan — independen dari pay_type."),
    )
    daily_rate_idr = models.DecimalField(
        _("daily rate (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
        help_text=_("Gaji per hari hadir (DAILY; dipakai jika gaji pokok bulanan kosong)."),
    )
    monthly_base_salary_idr = models.DecimalField(
        _("monthly base salary (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
        help_text=_(
            "Jika diisi (>0) dan cadence MONTHLY + DAILY: dipakai sebagai gaji pokok. "
            "Jika kosong: hitung dari tarif harian × hadir. Tidak dipakai untuk PIECE_RATE."
        ),
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("employee compensation")

    def __str__(self) -> str:
        return f"{self.user_id} [{self.pay_type}/{self.pay_cadence}]"


class KupasItem(models.Model):
    """Jenis barang kupas dengan tarif per kg (sama untuk semua pekerja)."""

    name = models.CharField(_("name"), max_length=100, unique=True)
    rate_per_kg_idr = models.DecimalField(
        _("rate per kg (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
    )
    resulting_ingredient = models.ForeignKey(
        "inventory.Ingredient",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kupas_items",
        verbose_name=_("resulting ingredient"),
        help_text=_("Bahan hasil kupas yang masuk stok (opsional)."),
    )
    is_active = models.BooleanField(_("active"), default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("kupas item")
        verbose_name_plural = _("kupas items")
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} @ {self.rate_per_kg_idr}/kg"


class PayrollPeriod(models.Model):
    """Satu periode gaji — scoped by cadence; cutoff inklusif di period_end_date."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        FINALIZED = "FINALIZED", _("Final")

    cadence = models.CharField(
        _("cadence"),
        max_length=16,
        choices=PayCadence.choices,
        default=PayCadence.WEEKLY,
        db_index=True,
    )
    pay_date = models.DateField(_("pay date"), db_index=True)
    period_start_date = models.DateField(_("period start"))
    period_end_date = models.DateField(_("period end (cutoff)"))
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
    gaji_cash_entry = models.OneToOneField(
        "expenses.OperationalCashEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_period_gaji",
        verbose_name=_("gaji kas entry"),
        help_text=_("Entri kas operasional untuk total gaji bersih periode ini."),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("payroll period")
        verbose_name_plural = _("payroll periods")
        constraints = [
            models.UniqueConstraint(fields=("cadence", "pay_date"), name="uniq_payroll_cadence_pay_date"),
        ]
        ordering = ["-pay_date"]

    def __str__(self) -> str:
        return f"{self.cadence} {self.pay_date.isoformat()} [{self.status}]"


class KupasProductionRecord(models.Model):
    """Catatan kg kupas per pekerja per hari per jenis barang."""

    employee = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="kupas_production_records",
        verbose_name=_("employee"),
        db_index=True,
    )
    work_date = models.DateField(_("work date"), db_index=True)
    kupas_item = models.ForeignKey(
        KupasItem,
        on_delete=models.PROTECT,
        related_name="production_records",
        verbose_name=_("kupas item"),
    )
    kg = models.DecimalField(
        _("kg"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
    )
    rate_snapshot_idr = models.DecimalField(
        _("rate snapshot (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
        help_text=_("Diisi saat periode difinalisasi."),
    )
    amount_idr = models.DecimalField(
        _("amount (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
        help_text=_("kg × tarif; diisi saat generate/finalize."),
    )
    paid_in_period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kupas_records_paid",
        verbose_name=_("paid in period"),
        db_index=True,
    )
    note = models.TextField(_("note"), blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("created by"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("kupas production record")
        verbose_name_plural = _("kupas production records")
        ordering = ["-work_date", "employee__full_name", "id"]
        indexes = [
            models.Index(fields=["employee", "work_date"]),
            models.Index(fields=["paid_in_period"]),
            models.Index(fields=["employee", "work_date", "kupas_item"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee_id} @{self.work_date} {self.kupas_item_id} {self.kg}kg"


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

    pay_type_snapshot = models.CharField(
        _("pay type snapshot"),
        max_length=16,
        choices=PayType.choices,
        default=PayType.DAILY,
    )
    base_salary_snapshot_idr = models.DecimalField(
        _("base salary snapshot (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
        help_text=_("Referensi gaji pokok bulanan saat generate."),
    )
    daily_rate_snapshot_idr = models.DecimalField(
        _("daily rate snapshot (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
    )
    days_present = models.PositiveIntegerField(_("days present"), default=0)
    late_count = models.PositiveIntegerField(_("late count"), default=0)
    total_kg = models.DecimalField(
        _("total kg (kupas)"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
    )
    gross_idr = models.DecimalField(
        _("gross (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
    )
    bonus_idr = models.DecimalField(
        _("bonus (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
        help_text=_("Tambahan (TBH)."),
    )
    advance_deduction_idr = models.DecimalField(
        _("advance deduction (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
        help_text=_("Pinjaman (PINJAM)."),
    )
    deductions_idr = models.DecimalField(
        _("deductions (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
        help_text=_("Potongan telat / lainnya."),
    )
    net_pay_idr = models.DecimalField(
        _("net pay (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        default=Decimal("0"),
    )
    notes = models.TextField(_("notes"), blank=True)
    paid_out = models.BooleanField(
        _("paid out"),
        default=False,
        db_index=True,
        help_text=_("Centang saat uang gaji sudah diserahkan ke pegawai."),
    )
    paid_out_at = models.DateTimeField(_("paid out at"), null=True, blank=True)

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


class PayrollLoanItem(models.Model):
    """Satu baris pinjaman yang dipotong dari slip; bisa banyak per pegawai."""

    class PaymentMethod(models.TextChoices):
        CASH = "CASH", _("Cash")
        TRANSFER = "TRANSFER", _("Transfer")

    entry = models.ForeignKey(
        PayrollEntry,
        on_delete=models.CASCADE,
        related_name="loan_items",
        verbose_name=_("payroll entry"),
    )
    amount_idr = models.DecimalField(
        _("amount (IDR)"),
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    occurred_on = models.DateField(_("occurred on"), db_index=True)
    payment_method = models.CharField(
        _("payment method"),
        max_length=10,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
        db_index=True,
    )
    note = models.CharField(_("note"), max_length=255, blank=True)
    cash_entry = models.OneToOneField(
        "expenses.OperationalCashEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payroll_loan_item",
        verbose_name=_("kas entry"),
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        verbose_name=_("created by"),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("payroll loan item")
        verbose_name_plural = _("payroll loan items")
        ordering = ["occurred_on", "id"]

    def save(self, *args, **kwargs):
        self.note = (self.note or "").strip().upper()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.entry_id} pinjam {self.amount_idr}"

