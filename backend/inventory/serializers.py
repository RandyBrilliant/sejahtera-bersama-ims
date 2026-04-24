from decimal import Decimal

from rest_framework import serializers

from .models import (
    Ingredient,
    IngredientInventory,
    IngredientStockMovement,
    Product,
    ProductPackaging,
    ProductStockMovement,
    ProductionBatch,
    ProductionIngredientUsage,
    ProductionPackagingOutput,
    StockMovementType,
)


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
    stock_value_idr = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductPackaging
        fields = [
            "id",
            "product",
            "product_name",
            "product_variant_name",
            "label",
            "net_mass_grams",
            "remaining_stock",
            "base_price_idr",
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
            "stock_value_idr",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_stock_value_idr(self, obj) -> int:
        return int((obj.remaining_stock or Decimal("0")) * (obj.base_price_idr or 0))

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

    class Meta:
        model = IngredientStockMovement
        fields = [
            "id",
            "ingredient_inventory",
            "ingredient_name",
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
    product_packaging_label = serializers.CharField(source="product_packaging.label", read_only=True)
    product_variant_name = serializers.CharField(
        source="product_packaging.product.variant_name",
        read_only=True,
    )
    total_increase_quantity = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ProductStockMovement
        fields = [
            "id",
            "product_packaging",
            "product_packaging_label",
            "product_variant_name",
            "movement_type",
            "quantity",
            "bonus_quantity",
            "total_increase_quantity",
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
            "product_variant_name",
            "total_increase_quantity",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_total_increase_quantity(self, obj):
        return obj.quantity + obj.bonus_quantity


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
