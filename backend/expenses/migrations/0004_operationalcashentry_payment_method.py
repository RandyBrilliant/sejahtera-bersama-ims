from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("expenses", "0003_remove_operationalcashentry_purchase_in_order"),
    ]

    operations = [
        migrations.AddField(
            model_name="operationalcashentry",
            name="payment_method",
            field=models.CharField(
                choices=[("CASH", "Cash"), ("TRANSFER", "Transfer")],
                db_index=True,
                default="CASH",
                max_length=10,
                verbose_name="payment method",
            ),
        ),
    ]
