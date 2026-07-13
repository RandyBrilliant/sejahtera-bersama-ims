"""Backfill perpetual costing fields from historical data.

Idempotent: recomputes ingredient/product moving-average costs and per-line
material COGS from verified purchases, production batches, and verified sales.
Historical sales COGS is approximate (uses the final seeded product average, not
the point-in-time average) and is flagged as such.

Usage:
    python manage.py backfill_costs [--dry-run]
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from inventory.models import IngredientInventory, Product, ProductionBatch
from purchase.models import OrderStatus, PurchaseInLine, SalesOrderLine


class Command(BaseCommand):
    help = "Backfill costing fields (ingredient/product avg cost, batch + sales COGS)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Compute and report totals without saving any changes.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        dry = options["dry_run"]

        ing_avg = self._backfill_ingredients(dry)
        prod_avg = self._backfill_products(dry, ing_avg)
        self._backfill_sales_cogs(dry, prod_avg)

        if dry:
            transaction.set_rollback(True)
            self.stdout.write(self.style.WARNING("DRY RUN — no changes were saved."))
        else:
            self.stdout.write(self.style.SUCCESS("Backfill complete."))

    def _backfill_ingredients(self, dry: bool) -> dict[int, Decimal]:
        agg: dict[int, list[Decimal]] = {}
        lines = PurchaseInLine.objects.filter(
            order__status=OrderStatus.VERIFIED
        ).values_list("ingredient_inventory_id", "quantity", "unit_cost_idr")
        for iid, quantity, unit_cost in lines:
            qty = Decimal(str(quantity))
            cost = qty * Decimal(str(unit_cost))
            bucket = agg.setdefault(iid, [Decimal("0"), Decimal("0")])
            bucket[0] += qty
            bucket[1] += cost

        ing_avg: dict[int, Decimal] = {}
        for iid, (qty, cost) in agg.items():
            avg = (cost / qty) if qty > 0 else Decimal("0")
            ing_avg[iid] = avg
            inv = IngredientInventory.objects.get(pk=iid)
            inv.avg_cost_idr = avg.quantize(Decimal("0.01"))
            if not dry:
                inv.save(update_fields=["avg_cost_idr", "updated_at"])
        self.stdout.write(f"Ingredients updated: {len(ing_avg)}")
        return ing_avg

    def _backfill_products(self, dry: bool, ing_avg: dict[int, Decimal]) -> dict[int, Decimal]:
        prod_cost: dict[int, Decimal] = {}
        prod_mass_g: dict[int, Decimal] = {}

        batches = ProductionBatch.objects.prefetch_related(
            "ingredient_usages",
            "packaging_outputs__product_packaging",
        ).order_by("production_date", "id")

        for batch in batches:
            material_cost = Decimal("0")
            for usage in batch.ingredient_usages.all():
                avg = ing_avg.get(usage.ingredient_inventory_id, Decimal("0"))
                material_cost += Decimal(str(usage.quantity_used)) * avg

            mass_by_pid: dict[int, Decimal] = {}
            for out in batch.packaging_outputs.all():
                pkg = out.product_packaging
                gm = (
                    Decimal(str(pkg.net_mass_kg))
                    * Decimal("1000")
                    * (Decimal(str(out.quantity_produced)) + Decimal(str(out.bonus_quantity or 0)))
                )
                mass_by_pid[pkg.product_id] = mass_by_pid.get(pkg.product_id, Decimal("0")) + gm

            total_out = sum(mass_by_pid.values(), Decimal("0"))
            batch.material_cost_idr = material_cost.quantize(Decimal("0.01"))
            if not dry:
                batch.save(update_fields=["material_cost_idr"])

            for pid, mg in mass_by_pid.items():
                share = (material_cost * (mg / total_out)) if total_out > 0 else Decimal("0")
                prod_cost[pid] = prod_cost.get(pid, Decimal("0")) + share
                prod_mass_g[pid] = prod_mass_g.get(pid, Decimal("0")) + mg

        prod_avg: dict[int, Decimal] = {}
        for pid, mg in prod_mass_g.items():
            mkg = mg / Decimal("1000")
            avg = (prod_cost[pid] / mkg) if mkg > 0 else Decimal("0")
            prod_avg[pid] = avg
            prod = Product.objects.get(pk=pid)
            prod.avg_cost_per_kg_idr = avg.quantize(Decimal("0.0001"))
            if not dry:
                prod.save(update_fields=["avg_cost_per_kg_idr", "updated_at"])
        self.stdout.write(f"Products updated: {len(prod_avg)}")
        return prod_avg

    def _backfill_sales_cogs(self, dry: bool, prod_avg: dict[int, Decimal]) -> None:
        count = 0
        so_lines = SalesOrderLine.objects.filter(
            order__status=OrderStatus.VERIFIED
        ).select_related("product_packaging__product")
        for line in so_lines:
            pkg = line.product_packaging
            avg = prod_avg.get(pkg.product_id)
            if avg is None:
                avg = Decimal(str(pkg.product.avg_cost_per_kg_idr or 0))
            line_mass_kg = Decimal(str(line.quantity)) * Decimal(str(pkg.net_mass_kg))
            cogs = int((line_mass_kg * avg).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
            line.cogs_material_idr = cogs
            if not dry:
                line.save(update_fields=["cogs_material_idr", "updated_at"])
            count += 1
        self.stdout.write(f"Sales lines updated (approximate historical COGS): {count}")
