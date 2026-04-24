from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from inventory.models import AuditModel, IngredientInventory, ProductPackaging


class OrderStatus(models.TextChoices):
    DRAFT = "DRAFT", _("Draft")
    SUBMITTED = "SUBMITTED", _("Submitted")
    AWAITING_PAYMENT = "AWAITING_PAYMENT", _("Awaiting payment")
    PAYMENT_PROOF_UPLOADED = "PAYMENT_PROOF_UPLOADED", _("Payment proof uploaded")
    VERIFIED = "VERIFIED", _("Verified by owner")
    CANCELLED = "CANCELLED", _("Cancelled")


class Customer(AuditModel):
    """Customer master data for sales (order out)."""

    name = models.CharField(_("customer name"), max_length=200, db_index=True)
    company_name = models.CharField(_("company name"), max_length=200, blank=True)
    phone = models.CharField(_("phone"), max_length=50, db_index=True)
    email = models.EmailField(_("email"), blank=True)
    address = models.TextField(_("address"), blank=True)
    tax_id = models.CharField(_("NPWP / tax id"), max_length=30, blank=True, db_index=True)
    notes = models.TextField(_("notes"), blank=True)
    is_active = models.BooleanField(_("active"), default=True, db_index=True)

    class Meta:
        verbose_name = _("customer")
        verbose_name_plural = _("customers")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "name"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return self.name


class CustomerProductPrice(AuditModel):
    """
    Per-customer selling price for a packaging SKU (set by admin / owner).
    Overrides default list_price_idr on ProductPackaging for that customer.
    """

    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="special_prices",
        verbose_name=_("customer"),
    )
    product_packaging = models.ForeignKey(
        ProductPackaging,
        on_delete=models.CASCADE,
        related_name="customer_prices",
        verbose_name=_("product packaging"),
    )
    selling_price_idr = models.PositiveBigIntegerField(
        _("selling price (IDR)"),
        validators=[MinValueValidator(1)],
    )
    note = models.CharField(_("note"), max_length=255, blank=True)
    is_active = models.BooleanField(_("active"), default=True, db_index=True)

    class Meta:
        verbose_name = _("customer product price")
        verbose_name_plural = _("customer product prices")
        ordering = ["customer__name", "product_packaging__label"]
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "product_packaging"],
                name="uq_customer_product_packaging_price",
            ),
        ]
        indexes = [
            models.Index(fields=["customer", "is_active"]),
            models.Index(fields=["product_packaging", "is_active"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.customer.name} / {self.product_packaging_id}"


def _upload_payment_proof_path(instance, filename: str) -> str:
    sub = "purchase_in" if instance.__class__.__name__ == "PurchaseInOrder" else "sales_order"
    code = getattr(instance, "order_code", None) or "new"
    return f"purchase/payment_proofs/{sub}/{code}/{filename}"


class PurchaseInOrder(AuditModel):
    """
    Order in: procurement of ingredients (supplier purchase).
    Warehouse/admin creates; owner verifies payment and order (then stock in).
    """

    order_code = models.CharField(_("order code"), max_length=32, unique=True, db_index=True)
    supplier_name = models.CharField(_("supplier name"), max_length=200)
    supplier_phone = models.CharField(_("supplier phone"), max_length=50, blank=True)
    status = models.CharField(
        _("status"),
        max_length=32,
        choices=OrderStatus.choices,
        default=OrderStatus.DRAFT,
        db_index=True,
    )
    invoice_number = models.CharField(_("invoice number"), max_length=64, blank=True, db_index=True)
    invoice_date = models.DateField(_("invoice date"), null=True, blank=True)
    due_date = models.DateField(_("due date"), null=True, blank=True)
    subtotal_idr = models.PositiveBigIntegerField(_("subtotal (IDR)"), default=0)
    tax_amount_idr = models.PositiveBigIntegerField(_("tax (IDR)"), default=0)
    total_idr = models.PositiveBigIntegerField(_("total (IDR)"), default=0)
    payment_proof = models.FileField(
        _("payment proof (bukti TF)"),
        upload_to=_upload_payment_proof_path,
        blank=True,
        null=True,
        max_length=500,
    )
    payment_proof_uploaded_at = models.DateTimeField(_("payment proof uploaded at"), null=True, blank=True)
    verified_at = models.DateTimeField(_("verified at"), null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_purchase_in_orders",
        verbose_name=_("verified by"),
    )
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        verbose_name = _("purchase in order")
        verbose_name_plural = _("purchase in orders")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["supplier_name"]),
            models.Index(fields=["created_by"]),
        ]

    def __str__(self) -> str:
        return self.order_code


class PurchaseInLine(AuditModel):
    order = models.ForeignKey(
        PurchaseInOrder,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name=_("order"),
    )
    ingredient_inventory = models.ForeignKey(
        IngredientInventory,
        on_delete=models.PROTECT,
        related_name="purchase_in_lines",
        verbose_name=_("ingredient inventory"),
    )
    quantity = models.DecimalField(
        _("quantity"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
    )
    unit_cost_idr = models.PositiveBigIntegerField(
        _("unit cost (IDR)"),
        validators=[MinValueValidator(1)],
    )

    class Meta:
        verbose_name = _("purchase in line")
        verbose_name_plural = _("purchase in lines")
        ordering = ["id"]
        indexes = [
            models.Index(fields=["order", "ingredient_inventory"]),
        ]

    @property
    def line_total_idr(self) -> int:
        return int(self.quantity * self.unit_cost_idr)


class SalesOrder(AuditModel):
    """
    Order out: customer sales order (purchase order from customer perspective).
    Sales staff creates; owner verifies payment and order (then stock out).
    """

    order_code = models.CharField(_("order code"), max_length=32, unique=True, db_index=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="sales_orders",
        verbose_name=_("customer"),
    )
    status = models.CharField(
        _("status"),
        max_length=32,
        choices=OrderStatus.choices,
        default=OrderStatus.DRAFT,
        db_index=True,
    )
    invoice_number = models.CharField(_("invoice number"), max_length=64, blank=True, db_index=True)
    invoice_date = models.DateField(_("invoice date"), null=True, blank=True)
    due_date = models.DateField(_("due date"), null=True, blank=True)
    subtotal_idr = models.PositiveBigIntegerField(_("subtotal (IDR)"), default=0)
    tax_amount_idr = models.PositiveBigIntegerField(_("tax (IDR)"), default=0)
    total_idr = models.PositiveBigIntegerField(_("total (IDR)"), default=0)
    payment_proof = models.FileField(
        _("payment proof (bukti TF)"),
        upload_to=_upload_payment_proof_path,
        blank=True,
        null=True,
        max_length=500,
    )
    payment_proof_uploaded_at = models.DateTimeField(_("payment proof uploaded at"), null=True, blank=True)
    verified_at = models.DateTimeField(_("verified at"), null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_sales_orders",
        verbose_name=_("verified by"),
    )
    notes = models.TextField(_("notes"), blank=True)

    class Meta:
        verbose_name = _("sales order")
        verbose_name_plural = _("sales orders")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["created_by"]),
        ]

    def __str__(self) -> str:
        return self.order_code


class SalesOrderLine(AuditModel):
    order = models.ForeignKey(
        SalesOrder,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name=_("order"),
    )
    product_packaging = models.ForeignKey(
        ProductPackaging,
        on_delete=models.PROTECT,
        related_name="sales_order_lines",
        verbose_name=_("product packaging"),
    )
    quantity = models.DecimalField(
        _("quantity"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
    )
    unit_price_idr = models.PositiveBigIntegerField(
        _("unit price (IDR)"),
        validators=[MinValueValidator(1)],
    )

    class Meta:
        verbose_name = _("sales order line")
        verbose_name_plural = _("sales order lines")
        ordering = ["id"]
        indexes = [
            models.Index(fields=["order", "product_packaging"]),
        ]

    @property
    def line_total_idr(self) -> int:
        return int(self.quantity * self.unit_price_idr)
