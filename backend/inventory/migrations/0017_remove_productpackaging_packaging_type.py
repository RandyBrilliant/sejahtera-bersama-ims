from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0016_product_tepung_split"),
        # Backfill sales lines before dropping the master column.
        ("purchase", "0014_salesorderline_packaging_type"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="productpackaging",
            name="packaging_type",
        ),
    ]
