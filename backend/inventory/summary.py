"""Inventory summary payload + short-lived cache."""

from decimal import Decimal

from django.core.cache import cache
from django.db import models
from django.db.models import Count, F, Sum
from django.db.models.functions import Coalesce

from .models import IngredientInventory, Product, ProductPackaging
from .product_stock import product_financial_value_idr

INVENTORY_SUMMARY_CACHE_KEY = "inventory:summary:v1"
INVENTORY_SUMMARY_CACHE_SECONDS = 120


def _decimal_zero(max_digits: int = 12, decimal_places: int = 3):
    from django.db.models import DecimalField, Value

    return Value(Decimal("0"), output_field=DecimalField(max_digits=max_digits, decimal_places=decimal_places))


def build_inventory_summary_payload() -> dict:
    product_aggregates = ProductPackaging.objects.aggregate(
        total_packaging=Count("id"),
        active_packaging=Count("id", filter=models.Q(is_active=True)),
    )
    mass_total = Product.objects.aggregate(
        total_product_mass_grams=Coalesce(Sum("remaining_mass_grams"), _decimal_zero()),
    )

    inventory_value_total = sum(
        product_financial_value_idr(p)
        for p in Product.objects.prefetch_related("packaging_variants").only(
            "id",
            "remaining_mass_grams",
        )
    )

    ingredient_aggregates = IngredientInventory.objects.aggregate(
        total_ingredient_items=Count("id"),
        low_stock_items=Count("id", filter=models.Q(remaining_stock__lt=F("minimum_stock"))),
        total_ingredient_stock=Coalesce(Sum("remaining_stock"), _decimal_zero()),
    )

    return {
        "products": {
            **product_aggregates,
            **mass_total,
            "total_product_stock_value_idr": str(inventory_value_total),
        },
        "ingredients": ingredient_aggregates,
    }


def get_inventory_summary_cached() -> dict:
    cached = cache.get(INVENTORY_SUMMARY_CACHE_KEY)
    if cached is not None:
        return cached
    payload = build_inventory_summary_payload()
    cache.set(INVENTORY_SUMMARY_CACHE_KEY, payload, INVENTORY_SUMMARY_CACHE_SECONDS)
    return payload


def invalidate_inventory_summary_cache() -> None:
    cache.delete(INVENTORY_SUMMARY_CACHE_KEY)
