"""Explain why inventory master rows cannot be deleted (PROTECT FKs)."""

from __future__ import annotations

from inventory.models import Ingredient, IngredientInventory, Product, ProductionPackagingOutput, ProductPackaging
from purchase.models import SalesOrderLine


def _join_reasons(parts: list[str]) -> str:
    if len(parts) == 1:
        return parts[0]
    if len(parts) == 2:
        return f"{parts[0]} dan {parts[1]}"
    return f"{', '.join(parts[:-1])}, dan {parts[-1]}"


def _count_reason(n: int, label: str) -> str | None:
    if n <= 0:
        return None
    return f"{label} ({n})"


def _in_use_message(subject: str, reasons: list[str]) -> str | None:
    if not reasons:
        return None
    return (
        f"Tidak dapat menghapus {subject} karena masih tercatat di {_join_reasons(reasons)}. "
        "Ubah status menjadi nonaktif lewat edit jika tidak ingin dipakai di transaksi baru."
    )


def product_in_use_detail(product: Product) -> str | None:
    pkg_ids = list(product.packaging_variants.values_list("pk", flat=True))
    sales = SalesOrderLine.objects.filter(product_packaging_id__in=pkg_ids).count() if pkg_ids else 0
    production = (
        ProductionPackagingOutput.objects.filter(product_packaging_id__in=pkg_ids).count() if pkg_ids else 0
    )
    movements = product.stock_movements.count()
    name = (product.variant_name or product.name).strip() or "produk ini"
    return _in_use_message(
        f"produk {name}",
        [
            r
            for r in (
                _count_reason(sales, "pesanan penjualan"),
                _count_reason(production, "hasil produksi"),
                _count_reason(movements, "mutasi stok"),
            )
            if r
        ],
    )


def packaging_in_use_detail(packaging: ProductPackaging) -> str | None:
    label = (packaging.label or "kemasan ini").strip()
    return _in_use_message(
        f"kemasan {label}",
        [
            r
            for r in (
                _count_reason(packaging.sales_order_lines.count(), "pesanan penjualan"),
                _count_reason(packaging.production_outputs.count(), "hasil produksi"),
                _count_reason(packaging.stock_movements.count(), "mutasi stok"),
            )
            if r
        ],
    )


def ingredient_in_use_detail(ingredient: Ingredient) -> str | None:
    try:
        inventory = ingredient.inventory
    except IngredientInventory.DoesNotExist:
        return None
    name = (ingredient.name or "bahan ini").strip()
    return _in_use_message(
        f"bahan {name}",
        [
            r
            for r in (
                _count_reason(inventory.purchase_in_lines.count(), "pesanan pembelian"),
                _count_reason(inventory.production_usages.count(), "pemakaian produksi"),
                _count_reason(inventory.stock_movements.count(), "mutasi stok"),
            )
            if r
        ],
    )
