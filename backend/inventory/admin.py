from django.contrib import admin

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
)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "variant_name", "is_active", "created_at", "updated_at")
    list_filter = ("is_active", "created_at", "updated_at")
    search_fields = ("name", "variant_name")


@admin.register(ProductPackaging)
class ProductPackagingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product",
        "label",
        "net_mass_grams",
        "remaining_stock",
        "base_price_idr",
        "is_active",
    )
    list_filter = ("is_active", "created_at", "updated_at")
    search_fields = ("product__name", "product__variant_name", "label", "sku")


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "default_unit", "is_active", "created_at", "updated_at")
    list_filter = ("default_unit", "is_active", "created_at", "updated_at")
    search_fields = ("name",)


@admin.register(IngredientInventory)
class IngredientInventoryAdmin(admin.ModelAdmin):
    list_display = ("id", "ingredient", "remaining_stock", "minimum_stock", "created_at", "updated_at")
    list_filter = ("created_at", "updated_at")
    search_fields = ("ingredient__name",)


@admin.register(IngredientStockMovement)
class IngredientStockMovementAdmin(admin.ModelAdmin):
    list_display = ("id", "ingredient_inventory", "movement_type", "quantity", "movement_at", "created_by")
    list_filter = ("movement_type", "movement_at")
    search_fields = ("ingredient_inventory__ingredient__name", "note")


@admin.register(ProductStockMovement)
class ProductStockMovementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product_packaging",
        "movement_type",
        "quantity",
        "bonus_quantity",
        "movement_at",
        "created_by",
    )
    list_filter = ("movement_type", "movement_at")
    search_fields = ("product_packaging__product__variant_name", "product_packaging__label", "note")


class ProductionIngredientUsageInline(admin.TabularInline):
    model = ProductionIngredientUsage
    extra = 0


class ProductionPackagingOutputInline(admin.TabularInline):
    model = ProductionPackagingOutput
    extra = 0


@admin.register(ProductionBatch)
class ProductionBatchAdmin(admin.ModelAdmin):
    list_display = ("id", "production_date", "shift_label", "created_by", "created_at")
    list_filter = ("production_date",)
    search_fields = ("shift_label", "note")
    inlines = [ProductionIngredientUsageInline, ProductionPackagingOutputInline]
