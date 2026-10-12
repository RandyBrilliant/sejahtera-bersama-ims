from django.db import migrations, models
from django.db.models import OuterRef, Subquery


def copy_packaging_type_from_master(apps, schema_editor):
    """Jenis kemasan moves from the kemasan master to each sales line."""
    SalesOrderLine = apps.get_model("purchase", "SalesOrderLine")
    ProductPackaging = apps.get_model("inventory", "ProductPackaging")
    SalesOrderLine.objects.update(
        packaging_type=Subquery(
            ProductPackaging.objects.filter(pk=OuterRef("product_packaging_id")).values("packaging_type")[:1]
        )
    )


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0016_product_tepung_split"),
        ("purchase", "0013_uppercase_customer_address_notes"),
    ]

    operations = [
        migrations.AddField(
            model_name="salesorderline",
            name="packaging_type",
            field=models.CharField(
                choices=[("KTK", "Kotak"), ("BAL", "Bal")],
                default="BAL",
                help_text="Jenis kemasan luar (Bal / Kotak) for this line; does not affect stock.",
                max_length=5,
                verbose_name="packaging type",
            ),
        ),
        migrations.RunPython(copy_packaging_type_from_master, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="salesorderline",
            constraint=models.UniqueConstraint(
                fields=("order", "product_packaging", "packaging_type"),
                name="uq_sales_line_packaging_type_per_order",
            ),
        ),
    ]
