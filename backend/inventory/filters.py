from django.db import models
from django_filters import rest_framework as filters

from .models import (
    Ingredient,
    IngredientInventory,
    IngredientStockMovement,
    Product,
    ProductPackaging,
    ProductStockMovement,
    ProductionBatch,
)


class ProductFilter(filters.FilterSet):
    created_at_from = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_to = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Product
        fields = {
            "is_active": ["exact"],
            "name": ["exact", "icontains"],
            "variant_name": ["exact", "icontains"],
            "created_by": ["exact"],
            "updated_by": ["exact"],
        }


class ProductPackagingFilter(filters.FilterSet):
    created_at_from = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_to = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    min_remaining_stock = filters.NumberFilter(field_name="remaining_stock", lookup_expr="gte")
    max_remaining_stock = filters.NumberFilter(field_name="remaining_stock", lookup_expr="lte")

    class Meta:
        model = ProductPackaging
        fields = {
            "product": ["exact"],
            "is_active": ["exact"],
            "label": ["exact", "icontains"],
            "sku": ["exact", "icontains"],
            "created_by": ["exact"],
            "updated_by": ["exact"],
            "net_mass_grams": ["exact", "gte", "lte"],
            "base_price_idr": ["exact", "gte", "lte"],
        }


class IngredientFilter(filters.FilterSet):
    created_at_from = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_to = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")

    class Meta:
        model = Ingredient
        fields = {
            "name": ["exact", "icontains"],
            "default_unit": ["exact"],
            "is_active": ["exact"],
            "created_by": ["exact"],
            "updated_by": ["exact"],
        }


class IngredientInventoryFilter(filters.FilterSet):
    created_at_from = filters.DateTimeFilter(field_name="created_at", lookup_expr="gte")
    created_at_to = filters.DateTimeFilter(field_name="created_at", lookup_expr="lte")
    min_remaining_stock = filters.NumberFilter(field_name="remaining_stock", lookup_expr="gte")
    max_remaining_stock = filters.NumberFilter(field_name="remaining_stock", lookup_expr="lte")
    is_below_minimum = filters.BooleanFilter(method="filter_is_below_minimum")

    class Meta:
        model = IngredientInventory
        fields = {
            "ingredient": ["exact"],
            "created_by": ["exact"],
            "updated_by": ["exact"],
            "minimum_stock": ["exact", "gte", "lte"],
        }

    def filter_is_below_minimum(self, queryset, name, value):
        if value is True:
            return queryset.filter(remaining_stock__lt=models.F("minimum_stock"))
        if value is False:
            return queryset.filter(remaining_stock__gte=models.F("minimum_stock"))
        return queryset


class IngredientStockMovementFilter(filters.FilterSet):
    movement_at_from = filters.DateTimeFilter(field_name="movement_at", lookup_expr="gte")
    movement_at_to = filters.DateTimeFilter(field_name="movement_at", lookup_expr="lte")

    class Meta:
        model = IngredientStockMovement
        fields = {
            "ingredient_inventory": ["exact"],
            "movement_type": ["exact"],
            "created_by": ["exact"],
            "movement_at": ["exact"],
        }


class ProductStockMovementFilter(filters.FilterSet):
    movement_at_from = filters.DateTimeFilter(field_name="movement_at", lookup_expr="gte")
    movement_at_to = filters.DateTimeFilter(field_name="movement_at", lookup_expr="lte")

    class Meta:
        model = ProductStockMovement
        fields = {
            "product_packaging": ["exact"],
            "movement_type": ["exact"],
            "created_by": ["exact"],
            "movement_at": ["exact"],
        }


class ProductionBatchFilter(filters.FilterSet):
    production_date_from = filters.DateFilter(field_name="production_date", lookup_expr="gte")
    production_date_to = filters.DateFilter(field_name="production_date", lookup_expr="lte")

    class Meta:
        model = ProductionBatch
        fields = {
            "production_date": ["exact"],
            "created_by": ["exact"],
            "shift_label": ["exact", "icontains"],
        }
