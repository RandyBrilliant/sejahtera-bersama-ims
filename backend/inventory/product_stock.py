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


def product_financial_value_idr(product) -> int:
    """
    Approximate inventory value using minimum observed cost per gram
    among this product's kemasan rows (consistent with aggregated dashboard).
    """
    mass = getattr(product, "remaining_mass_grams", None) or Decimal("0")
    if mass <= 0:
        return 0
    ratios: list[Decimal] = []
    for pkg in product.packaging_variants.all():
        g = net_kg_to_grams(Decimal(str(pkg.net_mass_kg)))
        if g <= 0 or not pkg.base_price_idr:
            continue
        ratios.append(Decimal(pkg.base_price_idr) / g)
    if not ratios:
        return 0
    return int((mass * min(ratios)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def packaging_line_stock_value_idr(packaging) -> int:
    """Value of physical stock at this SKU's implicit cost-per-gram."""
    prod = packaging.product
    mass = getattr(prod, "remaining_mass_grams", None) or Decimal("0")
    g = net_kg_to_grams(Decimal(str(packaging.net_mass_kg)))
    if mass <= 0 or g <= 0:
        return 0
    per_g = Decimal(packaging.base_price_idr) / g
    return int((mass * per_g).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
