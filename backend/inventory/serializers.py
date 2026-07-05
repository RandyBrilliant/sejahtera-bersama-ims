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
    StockMovementType,
)
from .product_stock import net_kg_to_grams, packaging_line_stock_value_idr


class AuditUserMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    full_name = serializers.CharField()


class ProductSerializer(serializers.ModelSerializer):
    created_by = AuditUserMiniSerializer(read_only=True)
    updated_by = AuditUserMiniSerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "variant_name",
            "remaining_mass_grams",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "remaining_mass_grams",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def validate_name(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Nama produk wajib diisi.")
        return cleaned

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
    remaining_stock = serializers.SerializerMethodField(read_only=True)
    stock_value_idr = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductPackaging
        fields = [
            "id",
            "product",
            "product_name",
            "product_variant_name",
            "label",
            "net_mass_kg",
            "remaining_stock",
            "base_price_idr",
            "list_price_idr",
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
            "remaining_stock",
            "stock_value_idr",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

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

    def get_stock_value_idr(self, obj) -> int:
        return packaging_line_stock_value_idr(obj)

    def validate_label(self, value: str):
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Label kemasan wajib diisi.")
        return cleaned


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
            "note",
            "movement_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by", "updated_by"]


class ProductStockMovementSerializer(serializers.ModelSerializer):
    created_by = AuditUserMiniSerializer(read_only=True)
    updated_by = AuditUserMiniSerializer(read_only=True)
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())
    product_packaging = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True)
    product_packaging_label = serializers.SerializerMethodField(read_only=True)
    product_variant_name = serializers.CharField(source="product.variant_name", read_only=True)
    total_mass_grams = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductStockMovement
        fields = [
            "id",
            "product",
            "product_packaging",
            "product_packaging_label",
            "product_variant_name",
            "movement_type",
            "mass_grams",
            "bonus_mass_grams",
            "total_mass_grams",
            "note",
            "movement_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "product_packaging",
            "product_packaging_label",
            "product_variant_name",
            "total_mass_grams",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_product_packaging_label(self, obj):
        if obj.product_packaging_id:
            return obj.product_packaging.label
        return ""

    def get_total_mass_grams(self, obj):
        return obj.mass_grams + obj.bonus_mass_grams

    def validate(self, attrs):
        mt = attrs["movement_type"]
        bonus = attrs.get("bonus_mass_grams")
        if bonus is None:
            bonus = Decimal("0")
        if mt == StockMovementType.OUT and bonus > 0:
            raise serializers.ValidationError(
                {"bonus_mass_grams": "Bonus massa hanya untuk mutasi masuk (IN)."}
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
