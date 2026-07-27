# Generated manually for verified_at reporting indexes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("purchase", "0010_salesorderline_cogs_material_idr"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="purchaseinorder",
            index=models.Index(
                fields=["status", "verified_at"],
                name="purchase_pu_status_verified_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="salesorder",
            index=models.Index(
                fields=["status", "verified_at"],
                name="purchase_sa_status_verified_idx",
            ),
        ),
    ]
