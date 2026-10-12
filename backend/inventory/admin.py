from django.contrib import admin

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
)
from .product_stock import packaging_total_price_idr


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "variant_name", "price_per_kg_idr", "remaining_mass_grams", "is_active", "created_at", "updated_at")
    list_filter = ("is_active", "created_at", "updated_at")
    search_fields = ("name", "variant_name")


@admin.register(ProductPackaging)
class ProductPackagingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "product",
        "label",
        "net_mass_kg",
        "variant_product_mass_g",
        "total_price_idr",
        "is_active",
    )
    list_filter = ("is_active", "created_at", "updated_at")
    search_fields = ("product__name", "product__variant_name", "label", "sku")

    @admin.display(description="Stok utama varian (g)", ordering="product__remaining_mass_grams")
    def variant_product_mass_g(self, obj):
        return obj.product.remaining_mass_grams

    @admin.display(description="Harga total kemasan (IDR)")
    def total_price_idr(self, obj):
        return packaging_total_price_idr(obj)


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
        "product",
        "product_packaging",
        "movement_type",
        "mass_grams",
        "bonus_mass_grams",
        "movement_at",
        "created_by",
    )
    list_filter = ("movement_type", "movement_at")
    search_fields = (
        "product__variant_name",
        "product_packaging__label",
        "note",
    )


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
