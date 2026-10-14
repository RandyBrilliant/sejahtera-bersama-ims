from decimal import Decimal

from rest_framework import serializers

from .models import (
    Ingredient,
    IngredientInventory,
    IngredientStockMovement,
    Product,
    ProductionBatch,
    ProductionIngredientUsage,
    ProductionPackagingOutput,
    ProductPackaging,
    ProductStockMovement,
    StockComponent,
    StockMovementType,
)
from .product_stock import (
    net_kg_to_grams,
    packaging_line_stock_value_idr,
    packaging_total_price_idr,
)


class AuditUserMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    full_name = serializers.CharField()


class ProductSerializer(serializers.ModelSerializer):
    created_by = AuditUserMiniSerializer(read_only=True)
    updated_by = AuditUserMiniSerializer(read_only=True)
    price_per_kg_idr = serializers.IntegerField(min_value=1)
    goreng_mass_grams = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "variant_name",
            "price_per_kg_idr",
            "remaining_mass_grams",
            "tracks_tepung",
            "tepung_mass_grams",
            "goreng_mass_grams",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "remaining_mass_grams",
            "tepung_mass_grams",
            "goreng_mass_grams",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_goreng_mass_grams(self, obj) -> str:
        goreng = (obj.remaining_mass_grams or Decimal("0")) - (obj.tepung_mass_grams or Decimal("0"))
        return str(goreng.quantize(Decimal("0.001")))

    def validate_tracks_tepung(self, value: bool) -> bool:
        if (
            not value
            and self.instance is not None
            and (self.instance.tepung_mass_grams or Decimal("0")) > 0
        ):
            raise serializers.ValidationError(
                "Masih ada stok tepung pada varian ini. Keluarkan stok tepung terlebih dahulu."
            )
        return value

    def validate_name(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Nama produk wajib diisi.")
        return cleaned

    def validate_price_per_kg_idr(self, value: int):
        if value is None or value < 1:
            raise serializers.ValidationError("Harga per kg wajib diisi dan lebih dari 0.")
        return value

    def validate_variant_name(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Jenis bawang goreng wajib diisi.")
        return cleaned


class ProductPackagingSerializer(serializers.ModelSerializer):
    created_by = AuditUserMiniSerializer(read_only=True)
    updated_by = AuditUserMiniSerializer(read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_variant_name = serializers.CharField(source="product.variant_name", read_only=True)
    price_per_kg_idr = serializers.IntegerField(source="product.price_per_kg_idr", read_only=True)
    product_remaining_mass_grams = serializers.DecimalField(
        source="product.remaining_mass_grams",
        read_only=True,
        max_digits=14,
        decimal_places=3,
    )
    remaining_stock = serializers.SerializerMethodField(read_only=True)
    total_price_idr = serializers.SerializerMethodField(read_only=True)
    stock_value_idr = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductPackaging
        fields = [
            "id",
            "product",
            "product_name",
            "product_variant_name",
            "price_per_kg_idr",
            "label",
            "net_mass_kg",
            "product_remaining_mass_grams",
            "remaining_stock",
            "total_price_idr",
            "stock_value_idr",
            "sku",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "product_name",
            "product_variant_name",
            "price_per_kg_idr",
            "product_remaining_mass_grams",
            "remaining_stock",
            "total_price_idr",
            "stock_value_idr",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        # Duplicate check lives in validate() for an Indonesian message.
        validators = []

    def get_remaining_stock(self, obj):
        annotated = getattr(obj, "remaining_stock", None)
        if annotated is not None:
            return annotated
        prod = getattr(obj, "product", None)
        mass = getattr(prod, "remaining_mass_grams", None) or Decimal("0") if prod else Decimal("0")
        net_g = net_kg_to_grams(Decimal(str(obj.net_mass_kg)))
        if net_g <= 0:
            return Decimal("0")
        return mass / net_g

    def get_total_price_idr(self, obj) -> int:
        return packaging_total_price_idr(obj)

    def get_stock_value_idr(self, obj) -> int:
        return packaging_line_stock_value_idr(obj)

    def validate_label(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Label kemasan wajib diisi.")
        return cleaned

    def validate(self, attrs):
        attrs = super().validate(attrs)
        product = attrs.get("product") or getattr(self.instance, "product", None)
        label = attrs.get("label", getattr(self.instance, "label", None))
        net_mass_kg = attrs.get("net_mass_kg", getattr(self.instance, "net_mass_kg", None))
        if product is not None and label and net_mass_kg is not None:
            duplicate = ProductPackaging.objects.filter(
                product=product, label__iexact=label, net_mass_kg=net_mass_kg
            )
            if self.instance is not None:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError(
                    {"label": "Kemasan dengan label dan berat yang sama sudah ada untuk produk ini."}
                )
        return attrs


class IngredientSerializer(serializers.ModelSerializer):
    created_by = AuditUserMiniSerializer(read_only=True)
    updated_by = AuditUserMiniSerializer(read_only=True)

    class Meta:
        model = Ingredient
        fields = [
            "id",
            "name",
            "default_unit",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]

    def validate_name(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Nama bahan wajib diisi.")
        return cleaned


class IngredientInventorySerializer(serializers.ModelSerializer):
    created_by = AuditUserMiniSerializer(read_only=True)
    updated_by = AuditUserMiniSerializer(read_only=True)
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    ingredient_unit = serializers.CharField(source="ingredient.default_unit", read_only=True)
    is_below_minimum = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = IngredientInventory
        fields = [
            "id",
            "ingredient",
            "ingredient_name",
            "ingredient_unit",
            "remaining_stock",
            "minimum_stock",
            "is_below_minimum",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "ingredient_name",
            "ingredient_unit",
            "is_below_minimum",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_is_below_minimum(self, obj) -> bool:
        return obj.remaining_stock < obj.minimum_stock


class IngredientStockMovementSerializer(serializers.ModelSerializer):
    created_by = AuditUserMiniSerializer(read_only=True)
    updated_by = AuditUserMiniSerializer(read_only=True)
    ingredient_name = serializers.CharField(
        source="ingredient_inventory.ingredient.name",
        read_only=True,
    )
    ingredient_unit = serializers.CharField(
        source="ingredient_inventory.ingredient.default_unit",
        read_only=True,
    )

    class Meta:
        model = IngredientStockMovement
        fields = [
            "id",
            "ingredient_inventory",
            "ingredient_name",
            "ingredient_unit",
            "movement_type",
            "quantity",
            "unit_cost_idr",
            "note",
            "movement_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]

    def validate_note(self, value: str) -> str:
        return (value or "").strip().upper()

    def validate(self, attrs):
        mt = attrs.get("movement_type") or getattr(self.instance, "movement_type", None)
        unit_cost = attrs.get("unit_cost_idr", serializers.empty)
        if unit_cost is serializers.empty:
            unit_cost = self.instance.unit_cost_idr if self.instance is not None else None
        if mt == StockMovementType.IN and unit_cost is None:
            raise serializers.ValidationError(
                {"unit_cost_idr": "Harga satuan wajib diisi untuk mutasi masuk (IN)."}
            )
        if mt == StockMovementType.IN and Decimal(str(unit_cost)) <= 0:
            raise serializers.ValidationError(
                {"unit_cost_idr": "Harga satuan harus lebih dari nol untuk mutasi masuk."}
            )
        return attrs


class ProductStockMovementSerializer(serializers.ModelSerializer):
    created_by = AuditUserMiniSerializer(read_only=True)
    updated_by = AuditUserMiniSerializer(read_only=True)
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    product_packaging = serializers.PrimaryKeyRelatedField(
        queryset=ProductPackaging.objects.select_related("product"),
        required=False,
        allow_null=True,
    )
    product_packaging_label = serializers.SerializerMethodField(read_only=True)
    product_packaging_net_mass_kg = serializers.SerializerMethodField(read_only=True)
    product_variant_name = serializers.CharField(source="product.variant_name", read_only=True)
    total_mass_grams = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductStockMovement
        fields = [
            "id",
            "product",
            "product_packaging",
            "product_packaging_label",
            "product_packaging_net_mass_kg",
            "product_variant_name",
            "movement_type",
            "mass_grams",
            "bonus_mass_grams",
            "total_mass_grams",
            "unit_cost_per_kg_idr",
            "stock_component",
            "tepung_mass_grams",
            "note",
            "movement_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "product_packaging_label",
            "product_packaging_net_mass_kg",
            "product_variant_name",
            "total_mass_grams",
            "tepung_mass_grams",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def validate_note(self, value: str) -> str:
        return (value or "").strip().upper()

    def get_product_packaging_label(self, obj):
        if obj.product_packaging_id:
            return obj.product_packaging.label
        return ""

    def get_product_packaging_net_mass_kg(self, obj):
        if obj.product_packaging_id:
            return str(obj.product_packaging.net_mass_kg)
        return None

    def get_total_mass_grams(self, obj):
        return obj.mass_grams + obj.bonus_mass_grams

    def validate(self, attrs):
        mt = attrs.get("movement_type") or getattr(self.instance, "movement_type", None)
        bonus = attrs.get("bonus_mass_grams")
        if bonus is None:
            bonus = Decimal("0")
        if mt == StockMovementType.OUT and bonus > 0:
            raise serializers.ValidationError(
                {"bonus_mass_grams": "Bonus massa hanya untuk mutasi masuk (IN)."}
            )
        unit_cost = attrs.get("unit_cost_per_kg_idr", serializers.empty)
        if unit_cost is serializers.empty:
            unit_cost = (
                self.instance.unit_cost_per_kg_idr if self.instance is not None else None
            )
        if mt == StockMovementType.IN and unit_cost is None:
            raise serializers.ValidationError(
                {
                    "unit_cost_per_kg_idr": (
                        "HPP per kg wajib diisi untuk mutasi masuk (IN)."
                    )
                }
            )
        if mt == StockMovementType.IN and Decimal(str(unit_cost)) <= 0:
            raise serializers.ValidationError(
                {
                    "unit_cost_per_kg_idr": (
                        "HPP per kg harus lebih dari nol untuk mutasi masuk."
                    )
                }
            )
        pkg = attrs.get("product_packaging")
        prod = attrs.get("product") or getattr(self.instance, "product", None)
        if pkg is not None and prod is not None and pkg.product_id != prod.pk:
            raise serializers.ValidationError(
                {"product_packaging": "Kemasan harus milik varian yang dipilih."}
            )
        component = attrs.get("stock_component") or ""
        if (
            component == StockComponent.TEPUNG
            and prod is not None
            and not prod.tracks_tepung
        ):
            raise serializers.ValidationError(
                {"stock_component": "Varian ini tidak memisahkan stok tepung."}
            )
        return attrs


class ProductionIngredientUsageInputSerializer(serializers.Serializer):
    ingredient_inventory = serializers.PrimaryKeyRelatedField(queryset=IngredientInventory.objects.select_related("ingredient"))
    quantity_used = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))


class ProductionPackagingOutputInputSerializer(serializers.Serializer):
    product_packaging = serializers.PrimaryKeyRelatedField(queryset=ProductPackaging.objects.select_related("product"))
    quantity_produced = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"))
    bonus_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0"), default=Decimal("0"))


class ProductionIngredientUsageReadSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient_inventory.ingredient.name", read_only=True)
    unit = serializers.CharField(source="ingredient_inventory.ingredient.default_unit", read_only=True)

    class Meta:
        model = ProductionIngredientUsage
        fields = ["id", "ingredient_inventory", "ingredient_name", "unit", "quantity_used"]


class ProductionPackagingOutputReadSerializer(serializers.ModelSerializer):
    product_variant_name = serializers.CharField(source="product_packaging.product.variant_name", read_only=True)
    packaging_label = serializers.CharField(source="product_packaging.label", read_only=True)
    total_quantity_in = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductionPackagingOutput
        fields = [
            "id",
            "product_packaging",
            "product_variant_name",
            "packaging_label",
            "quantity_produced",
            "bonus_quantity",
            "total_quantity_in",
        ]

    def get_total_quantity_in(self, obj):
        return obj.quantity_produced + obj.bonus_quantity


class ProductionBatchSerializer(serializers.ModelSerializer):
    created_by = AuditUserMiniSerializer(read_only=True)
    updated_by = AuditUserMiniSerializer(read_only=True)
    ingredient_usages = ProductionIngredientUsageReadSerializer(many=True, read_only=True)
    packaging_outputs = ProductionPackagingOutputReadSerializer(many=True, read_only=True)
    total_ingredient_used = serializers.SerializerMethodField(read_only=True)
    total_product_packages = serializers.SerializerMethodField(read_only=True)
    total_bonus_packages = serializers.SerializerMethodField(read_only=True)

    ingredient_usages_input = ProductionIngredientUsageInputSerializer(many=True, write_only=True)
    packaging_outputs_input = ProductionPackagingOutputInputSerializer(many=True, write_only=True)

    class Meta:
        model = ProductionBatch
        fields = [
            "id",
            "production_date",
            "shift_label",
            "note",
            "ingredient_usages",
            "packaging_outputs",
            "ingredient_usages_input",
            "packaging_outputs_input",
            "total_ingredient_used",
            "total_product_packages",
            "total_bonus_packages",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "ingredient_usages",
            "packaging_outputs",
            "total_ingredient_used",
            "total_product_packages",
            "total_bonus_packages",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def validate_note(self, value: str) -> str:
        return (value or "").strip().upper()

    def validate_shift_label(self, value: str) -> str:
        return (value or "").strip().upper()

    def validate(self, attrs):
        ingredient_usages = attrs.get("ingredient_usages_input") or []
        packaging_outputs = attrs.get("packaging_outputs_input") or []

        if not ingredient_usages:
            raise serializers.ValidationError({"ingredient_usages_input": ["Minimal 1 bahan harus diinput."]})
        if not packaging_outputs:
            raise serializers.ValidationError({"packaging_outputs_input": ["Minimal 1 output kemasan harus diinput."]})

        ingredient_ids = [item["ingredient_inventory"].id for item in ingredient_usages]
        if len(set(ingredient_ids)) != len(ingredient_ids):
            raise serializers.ValidationError({"ingredient_usages_input": ["Bahan tidak boleh duplikat dalam satu batch."]})

        packaging_ids = [item["product_packaging"].id for item in packaging_outputs]
        if len(set(packaging_ids)) != len(packaging_ids):
            raise serializers.ValidationError({"packaging_outputs_input": ["Kemasan produk tidak boleh duplikat dalam satu batch."]})

        return attrs

    def get_total_ingredient_used(self, obj):
        total = Decimal("0")
        for row in obj.ingredient_usages.all():
            total += row.quantity_used
        return total

    def get_total_product_packages(self, obj):
        total = Decimal("0")
        for row in obj.packaging_outputs.all():
            total += row.quantity_produced
        return total

    def get_total_bonus_packages(self, obj):
        total = Decimal("0")
        for row in obj.packaging_outputs.all():
            total += row.bonus_quantity
        return total
