# Generated manually for gram-based product stock ledger.

from decimal import Decimal

from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


def forwards_fill_mass_fields(apps, schema_editor):
    ProductStockMovement = apps.get_model("inventory", "ProductStockMovement")
    for m in ProductStockMovement.objects.select_related("product_packaging").iterator():
        pkg = m.product_packaging
        net = Decimal(str(pkg.net_mass_kg))
        g_per = net * Decimal("1000")
        m.product_id = pkg.product_id
        m.mass_grams = g_per * Decimal(str(m.quantity))
        if m.movement_type == "IN":
            m.bonus_mass_grams = g_per * Decimal(str(m.bonus_quantity))
        else:
            m.bonus_mass_grams = Decimal("0")
        m.save(update_fields=["product_id", "mass_grams", "bonus_mass_grams"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0007_alter_productpackaging_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="productstockmovement",
            name="product",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="stock_movements",
                to="inventory.product",
                verbose_name="product",
            ),
        ),
        migrations.AddField(
            model_name="productstockmovement",
            name="mass_grams",
            field=models.DecimalField(
                decimal_places=3,
                help_text="Main movement amount in grams (always positive).",
                max_digits=14,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0.001"))],
                verbose_name="mass (grams)",
            ),
        ),
        migrations.AddField(
            model_name="productstockmovement",
            name="bonus_mass_grams",
            field=models.DecimalField(
                decimal_places=3,
                default=0,
                help_text="Additional grams on IN movements only.",
                max_digits=14,
                validators=[django.core.validators.MinValueValidator(0)],
                verbose_name="bonus mass (grams)",
            ),
        ),
        migrations.RunPython(forwards_fill_mass_fields, noop_reverse),
        migrations.AlterField(
            model_name="productstockmovement",
            name="product",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="stock_movements",
                to="inventory.product",
                verbose_name="product",
            ),
        ),
        migrations.AlterField(
            model_name="productstockmovement",
            name="mass_grams",
            field=models.DecimalField(
                decimal_places=3,
                help_text="Main movement amount in grams (always positive).",
                max_digits=14,
                validators=[django.core.validators.MinValueValidator(Decimal("0.001"))],
                verbose_name="mass (grams)",
            ),
        ),
        migrations.RemoveField(
            model_name="productstockmovement",
            name="quantity",
        ),
        migrations.RemoveField(
            model_name="productstockmovement",
            name="bonus_quantity",
        ),
        migrations.AlterField(
            model_name="productstockmovement",
            name="product_packaging",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="stock_movements",
                to="inventory.productpackaging",
                verbose_name="product packaging",
            ),
        ),
        migrations.AddIndex(
            model_name="productstockmovement",
            index=models.Index(fields=["product", "movement_type"], name="inventory_p_product_e3_idx"),
        ),
    ]
