"""Berat bersih kemasan dalam kg (bukan gram)."""

from decimal import Decimal

import django.core.validators
from django.db import migrations, models


def forwards_net_mass_kg(apps, schema_editor):
    ProductPackaging = apps.get_model("inventory", "ProductPackaging")
    for pkg in ProductPackaging.objects.all():
        grams = getattr(pkg, "net_mass_grams", None)
        if grams is None:
            continue
        pkg.net_mass_kg = (Decimal(str(grams)) / Decimal("1000")).quantize(Decimal("0.000001"))
        pkg.save(update_fields=["net_mass_kg"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0005_product_remaining_mass"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="productpackaging",
            name="uq_product_packaging_mass_per_product",
        ),
        migrations.RemoveIndex(
            model_name="productpackaging",
            name="inventory_p_net_mas_ca4bae_idx",
        ),
        migrations.AddField(
            model_name="productpackaging",
            name="net_mass_kg",
            field=models.DecimalField(
                decimal_places=6,
                max_digits=12,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0.000001"))],
                verbose_name="net mass (kg)",
            ),
        ),
        migrations.RunPython(forwards_net_mass_kg, noop_reverse),
        migrations.RemoveField(
            model_name="productpackaging",
            name="net_mass_grams",
        ),
        migrations.AlterField(
            model_name="productpackaging",
            name="net_mass_kg",
            field=models.DecimalField(
                decimal_places=6,
                max_digits=12,
                validators=[django.core.validators.MinValueValidator(Decimal("0.000001"))],
                verbose_name="net mass (kg)",
            ),
        ),
        migrations.AddConstraint(
            model_name="productpackaging",
            constraint=models.UniqueConstraint(
                fields=("product", "net_mass_kg"),
                name="uq_product_packaging_mass_per_product",
            ),
        ),
        migrations.AddIndex(
            model_name="productpackaging",
            index=models.Index(fields=["net_mass_kg"], name="inv_pp_net_mass_kg_idx"),
        ),
    ]
