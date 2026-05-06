"""Stok utama per varian produk (gram); hapus stok per-kemasan."""

from decimal import Decimal

import django.core.validators
from django.db import migrations, models


def backfill_remaining_mass_from_packaging_stock(apps, schema_editor):
    Product = apps.get_model("inventory", "Product")
    ProductPackaging = apps.get_model("inventory", "ProductPackaging")

    for prod in Product.objects.all().iterator():
        total = Decimal("0")
        for pkg in ProductPackaging.objects.filter(product_id=prod.id):
            total += Decimal(str(pkg.remaining_stock)) * Decimal(pkg.net_mass_grams)
        prod.remaining_mass_grams = total
        prod.save(update_fields=["remaining_mass_grams"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0004_backfill_ingredient_inventory"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="remaining_mass_grams",
            field=models.DecimalField(
                decimal_places=3,
                default=0,
                help_text="Total bulk stock for this variant (shared across all kemasan).",
                max_digits=14,
                validators=[django.core.validators.MinValueValidator(0)],
                verbose_name="remaining mass (grams)",
            ),
        ),
        migrations.RunPython(backfill_remaining_mass_from_packaging_stock, noop_reverse),
        migrations.RemoveField(
            model_name="productpackaging",
            name="remaining_stock",
        ),
    ]
