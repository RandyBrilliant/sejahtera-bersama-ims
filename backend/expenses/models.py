from django.core.validators import MinValueValidator
from django.db import models
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

from inventory.models import AuditModel


class EntryKind(models.TextChoices):
    """Whether a category (and its entries) record income or expense."""

    INCOME = "INCOME", _("Pemasukan")
    EXPENSE = "EXPENSE", _("Pengeluaran")


class PaymentMethod(models.TextChoices):
    CASH = "CASH", _("Cash")
    TRANSFER = "TRANSFER", _("Transfer")


def _attachment_upload_to(instance, filename: str) -> str:
    return f"expenses/attachments/{instance.occurred_on.year}/{instance.occurred_on.month:02d}/{filename}"


class OperationalCategory(AuditModel):
    """
    Chart-of-accounts style category for operational cash entries.
    Each category is either income or expense (not mixed on one row).
    """

    name = models.CharField(_("name"), max_length=120)
    slug = models.SlugField(_("slug"), max_length=140, unique=True, db_index=True)
    entry_kind = models.CharField(
        _("entry kind"),
        max_length=10,
        choices=EntryKind.choices,
        db_index=True,
    )
    description = models.TextField(_("description"), blank=True)
    sort_order = models.PositiveSmallIntegerField(_("sort order"), default=0)
    is_active = models.BooleanField(_("active"), default=True, db_index=True)

    class Meta:
        verbose_name = _("operational category")
        verbose_name_plural = _("operational categories")
        ordering = ["entry_kind", "sort_order", "name"]
        indexes = [
            models.Index(fields=["entry_kind", "is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_entry_kind_display()}: {self.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:120] or "category"
            slug = base
            n = 1
            while OperationalCategory.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                n += 1
                slug = f"{base}-{n}"
            self.slug = slug
        super().save(*args, **kwargs)


class OperationalCashEntry(AuditModel):
    """
    Single ledger line: operational income (pemasukan) or expense (pengeluaran).
    Amounts are whole Rupiah (no decimal).
    """

    direction = models.CharField(
        _("direction"),
        max_length=10,
        choices=EntryKind.choices,
        db_index=True,
    )
    payment_method = models.CharField(
        _("payment method"),
        max_length=10,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CASH,
        db_index=True,
    )
    category = models.ForeignKey(
        OperationalCategory,
        on_delete=models.PROTECT,
        related_name="entries",
        verbose_name=_("category"),
    )
    amount_idr = models.PositiveBigIntegerField(
        _("amount (IDR)"),
        validators=[MinValueValidator(1)],
    )
    occurred_on = models.DateField(_("occurred on"), db_index=True)
    description = models.TextField(_("description"))
    reference = models.CharField(
        _("external reference"),
        max_length=120,
        blank=True,
        help_text=_("Optional reference, e.g. invoice number or PO code."),
    )
    attachment = models.FileField(
        _("attachment"),
        upload_to=_attachment_upload_to,
        blank=True,
        null=True,
        max_length=500,
    )
    sales_order = models.ForeignKey(
        "purchase.SalesOrder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="operational_cash_entries",
        verbose_name=_("linked sales order"),
        help_text=_("Optional link when this line relates to a customer sale (pemasukan)."),
    )

    class Meta:
        verbose_name = _("operational cash entry")
        verbose_name_plural = _("operational cash entries")
        ordering = ["-occurred_on", "-id"]
        indexes = [
            models.Index(fields=["occurred_on", "direction"]),
            models.Index(fields=["category", "occurred_on"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["sales_order"]),
        ]

    def save(self, *args, **kwargs):
        self.description = (self.description or "").strip().upper()
        self.reference = (self.reference or "").strip().upper()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.occurred_on} {self.direction} {self.amount_idr}"
