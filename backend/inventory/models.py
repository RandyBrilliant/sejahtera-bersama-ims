from django.core.validators import MinValueValidator
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """Abstract base model for created/updated timestamps."""

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        abstract = True


class AuditModel(TimeStampedModel):
    """Adds audit user tracking for create/update actions."""

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_created_records",
        verbose_name=_("created by"),
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_updated_records",
        verbose_name=_("updated by"),
    )

    class Meta:
        abstract = True


class Product(AuditModel):
    """
    Finished goods for bawang goreng inventory.

    Each row represents one bawang goreng type/variant (e.g., Original, Pedas),
    and each variant can have multiple packaging sizes via ProductPackaging.
    """

    name = models.CharField(_("product name"), max_length=150, default="Bawang Goreng")
    variant_name = models.CharField(_("bawang goreng type"), max_length=100, db_index=True)
    is_active = models.BooleanField(_("active"), default=True, db_index=True)

    class Meta:
        verbose_name = _("product")
        verbose_name_plural = _("products")
        ordering = ["variant_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "variant_name"],
                name="uq_product_name_variant",
            ),
        ]
        indexes = [
            models.Index(fields=["variant_name", "is_active"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["updated_by"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.variant_name}"


class ProductPackaging(AuditModel):
    """
    Packaging variant for a product.

    Example: Same product with 250g, 500g, and 1000g packaging.
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="packaging_variants",
        verbose_name=_("product"),
    )
    label = models.CharField(_("packaging label"), max_length=100)
    net_mass_grams = models.PositiveIntegerField(
        _("net mass (grams)"),
        validators=[MinValueValidator(1)],
    )
    remaining_stock = models.DecimalField(
        _("remaining stock"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0)],
        default=0,
    )
    base_price_idr = models.PositiveBigIntegerField(
        _("base price (IDR)"),
        validators=[MinValueValidator(1)],
        help_text=_("Base purchase price in Rupiah, without decimals."),
    )
    list_price_idr = models.PositiveBigIntegerField(
        _("list selling price (IDR)"),
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text=_("Default selling price in Rupiah; used when no customer special price is set."),
        db_index=True,
    )
    sku = models.CharField(_("SKU"), max_length=50, blank=True)
    is_active = models.BooleanField(_("active"), default=True, db_index=True)

    class Meta:
        verbose_name = _("product packaging")
        verbose_name_plural = _("product packaging")
        ordering = ["product__name", "net_mass_grams", "label"]
        constraints = [
            models.UniqueConstraint(
                fields=["product", "label"],
                name="uq_product_packaging_label_per_product",
            ),
            models.UniqueConstraint(
                fields=["product", "net_mass_grams"],
                name="uq_product_packaging_mass_per_product",
            ),
        ]
        indexes = [
            models.Index(fields=["product", "is_active"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["updated_by"]),
            models.Index(fields=["remaining_stock"]),
            models.Index(fields=["base_price_idr"]),
            models.Index(fields=["net_mass_grams"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.product.name} - {self.label} ({self.net_mass_grams}g)"


class StockUnit(models.TextChoices):
    """Units used to quantify ingredient stock."""

    KILOGRAM = "KG", _("Kilogram")
    LITER = "L", _("Liter")
    PIECE = "PCS", _("Piece")


class Ingredient(AuditModel):
    """Raw material master data (e.g., tepung, minyak, bawang, plastik)."""

    name = models.CharField(_("ingredient name"), max_length=100, unique=True)
    default_unit = models.CharField(
        _("default stock unit"),
        max_length=5,
        choices=StockUnit.choices,
        default=StockUnit.KILOGRAM,
        db_index=True,
    )
    is_active = models.BooleanField(_("active"), default=True, db_index=True)

    class Meta:
        verbose_name = _("ingredient")
        verbose_name_plural = _("ingredients")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["default_unit", "is_active"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["updated_by"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return self.name


class IngredientInventory(AuditModel):
    """Current stock snapshot for each ingredient."""

    ingredient = models.OneToOneField(
        Ingredient,
        on_delete=models.CASCADE,
        related_name="inventory",
        verbose_name=_("ingredient"),
    )
    remaining_stock = models.DecimalField(
        _("remaining stock"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0)],
        default=0,
    )
    minimum_stock = models.DecimalField(
        _("minimum stock"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0)],
        default=0,
    )

    class Meta:
        verbose_name = _("ingredient inventory")
        verbose_name_plural = _("ingredient inventories")
        ordering = ["ingredient__name"]
        indexes = [
            models.Index(fields=["created_by"]),
            models.Index(fields=["updated_by"]),
            models.Index(fields=["remaining_stock"]),
            models.Index(fields=["minimum_stock"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.ingredient.name}: {self.remaining_stock} {self.ingredient.default_unit}"


class StockMovementType(models.TextChoices):
    IN = "IN", _("Stock In")
    OUT = "OUT", _("Stock Out")


class IngredientStockMovement(AuditModel):
    """Immutable ingredient stock movement ledger."""

    ingredient_inventory = models.ForeignKey(
        IngredientInventory,
        on_delete=models.PROTECT,
        related_name="stock_movements",
        verbose_name=_("ingredient inventory"),
    )
    movement_type = models.CharField(
        _("movement type"),
        max_length=3,
        choices=StockMovementType.choices,
        db_index=True,
    )
    quantity = models.DecimalField(
        _("quantity"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
    )
    note = models.TextField(_("note"), blank=True)
    movement_at = models.DateTimeField(_("movement at"), db_index=True)

    class Meta:
        verbose_name = _("ingredient stock movement")
        verbose_name_plural = _("ingredient stock movements")
        ordering = ["-movement_at", "-id"]
        indexes = [
            models.Index(fields=["ingredient_inventory", "movement_type"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["updated_by"]),
            models.Index(fields=["movement_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.ingredient_inventory.ingredient.name} {self.movement_type} {self.quantity}"


class ProductStockMovement(AuditModel):
    """Immutable product packaging stock movement ledger."""

    product_packaging = models.ForeignKey(
        ProductPackaging,
        on_delete=models.PROTECT,
        related_name="stock_movements",
        verbose_name=_("product packaging"),
    )
    movement_type = models.CharField(
        _("movement type"),
        max_length=3,
        choices=StockMovementType.choices,
        db_index=True,
    )
    quantity = models.DecimalField(
        _("quantity"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
    )
    bonus_quantity = models.DecimalField(
        _("bonus quantity"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0)],
        default=0,
        help_text=_("Extra package quantity produced as bonus."),
    )
    note = models.TextField(_("note"), blank=True)
    movement_at = models.DateTimeField(_("movement at"), db_index=True)

    class Meta:
        verbose_name = _("product stock movement")
        verbose_name_plural = _("product stock movements")
        ordering = ["-movement_at", "-id"]
        indexes = [
            models.Index(fields=["product_packaging", "movement_type"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["updated_by"]),
            models.Index(fields=["movement_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.product_packaging} {self.movement_type} {self.quantity}"


class ProductionBatch(AuditModel):
    """Daily production record input by warehouse staff."""

    production_date = models.DateField(_("production date"), db_index=True)
    shift_label = models.CharField(_("shift label"), max_length=50, blank=True)
    note = models.TextField(_("note"), blank=True)

    class Meta:
        verbose_name = _("production batch")
        verbose_name_plural = _("production batches")
        ordering = ["-production_date", "-id"]
        indexes = [
            models.Index(fields=["production_date"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["updated_by"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"Batch {self.production_date} #{self.id}"


class ProductionIngredientUsage(models.Model):
    """Ingredient quantities consumed in one production batch."""

    batch = models.ForeignKey(
        ProductionBatch,
        on_delete=models.CASCADE,
        related_name="ingredient_usages",
        verbose_name=_("batch"),
    )
    ingredient_inventory = models.ForeignKey(
        IngredientInventory,
        on_delete=models.PROTECT,
        related_name="production_usages",
        verbose_name=_("ingredient inventory"),
    )
    quantity_used = models.DecimalField(
        _("quantity used"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
    )

    class Meta:
        verbose_name = _("production ingredient usage")
        verbose_name_plural = _("production ingredient usages")
        constraints = [
            models.UniqueConstraint(
                fields=["batch", "ingredient_inventory"],
                name="uq_batch_ingredient_usage",
            ),
        ]
        indexes = [
            models.Index(fields=["batch", "ingredient_inventory"]),
        ]


class ProductionPackagingOutput(models.Model):
    """Product package quantities produced in one production batch."""

    batch = models.ForeignKey(
        ProductionBatch,
        on_delete=models.CASCADE,
        related_name="packaging_outputs",
        verbose_name=_("batch"),
    )
    product_packaging = models.ForeignKey(
        ProductPackaging,
        on_delete=models.PROTECT,
        related_name="production_outputs",
        verbose_name=_("product packaging"),
    )
    quantity_produced = models.DecimalField(
        _("quantity produced"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
    )
    bonus_quantity = models.DecimalField(
        _("bonus quantity"),
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(0)],
        default=0,
    )

    class Meta:
        verbose_name = _("production packaging output")
        verbose_name_plural = _("production packaging outputs")
        constraints = [
            models.UniqueConstraint(
                fields=["batch", "product_packaging"],
                name="uq_batch_product_packaging_output",
            ),
        ]
        indexes = [
            models.Index(fields=["batch", "product_packaging"]),
        ]
