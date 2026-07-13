"""Logic for finished-goods inventory kept as total mass per Product (grams)."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.db.models import DecimalField, ExpressionWrapper, F, Value
from django.db.models.functions import Cast

# ProductPackaging.net_mass_kg × this → grams per kemasan unit.
KG_TO_GRAMS = Decimal("1000")

GRAM14 = DecimalField(max_digits=14, decimal_places=3)
NET_KG = DecimalField(max_digits=14, decimal_places=6)
OUT_EQ = DecimalField(max_digits=24, decimal_places=12)


def net_kg_to_grams(net_mass_kg: Decimal) -> Decimal:
    return net_mass_kg * KG_TO_GRAMS


def annotate_packaging_derived_remaining(qs):
    """
    Equivalent package count for this SKU from shared product mass:
    remaining_mass_grams / (net_mass_kg × 1000).
    """
    qs = qs.annotate(
        _net_mass_g=ExpressionWrapper(
            Cast(F("net_mass_kg"), NET_KG) * Value(KG_TO_GRAMS),
            output_field=GRAM14,
        )
    )
    return qs.annotate(
        remaining_stock=ExpressionWrapper(
            Cast(F("product__remaining_mass_grams"), GRAM14) / F("_net_mass_g"),
            output_field=OUT_EQ,
        )
    )


def grams_delta_for_packaging_movement(
    *,
    movement_type: str,
    net_mass_kg: Decimal,
    quantity: Decimal,
    bonus_quantity: Decimal,
) -> Decimal:
    """
    Signed change to Product.remaining_mass_grams (positive = stock increases).

    Uses the same convention as ledger lines: quantity is always the main packages;
    bonus only applies on IN movements.
    """
    from .models import StockMovementType

    grams_per_unit = net_kg_to_grams(net_mass_kg)
    if movement_type == StockMovementType.IN:
        return grams_per_unit * (quantity + bonus_quantity)
    return -(grams_per_unit * quantity)


def grams_delta_from_mass_fields(
    *,
    movement_type: str,
    mass_grams: Decimal,
    bonus_mass_grams: Decimal,
) -> Decimal:
    """Signed change to Product.remaining_mass_grams from ledger mass columns."""
    from .models import StockMovementType

    if movement_type == StockMovementType.IN:
        return mass_grams + bonus_mass_grams
    return -mass_grams


def weighted_moving_average(old_qty, old_avg_unit_cost, add_qty, add_total_cost) -> Decimal:
    """
    Perpetual moving-average unit cost after adding ``add_qty`` whose total cost
    is ``add_total_cost``.

    Works for ingredients (unit = stock unit) and finished goods (unit = gram):
    ``new_avg = (old_qty * old_avg + add_total_cost) / (old_qty + add_qty)``.
    Returns the previous average when the resulting quantity is not positive.
    """
    old_qty = Decimal(str(old_qty or 0))
    old_avg = Decimal(str(old_avg_unit_cost or 0))
    add_qty = Decimal(str(add_qty or 0))
    add_total_cost = Decimal(str(add_total_cost or 0))
    new_qty = old_qty + add_qty
    if new_qty <= 0:
        return old_avg
    return (old_qty * old_avg + add_total_cost) / new_qty


def product_financial_value_idr(product) -> int:
    """
    Inventory value from the product's fixed price per kg:
    remaining_mass_grams × (price_per_kg_idr / 1000).
    """
    mass = getattr(product, "remaining_mass_grams", None) or Decimal("0")
    price_per_kg = getattr(product, "price_per_kg_idr", None) or Decimal("0")
    if mass <= 0 or price_per_kg <= 0:
        return 0
    per_g = Decimal(price_per_kg) / KG_TO_GRAMS
    return int((mass * per_g).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def packaging_total_price_idr(packaging) -> int:
    """Harga total per kemasan: product price per kg × net mass (kg)."""
    price_per_kg = getattr(packaging.product, "price_per_kg_idr", None) or Decimal("0")
    if price_per_kg <= 0:
        return 0
    total = Decimal(price_per_kg) * Decimal(str(packaging.net_mass_kg))
    return int(total.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def packaging_line_stock_value_idr(packaging) -> int:
    """Value of physical stock for the shared variant mass at the fixed price per kg."""
    return product_financial_value_idr(packaging.product)
