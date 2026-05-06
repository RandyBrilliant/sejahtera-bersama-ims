from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("purchase", "0002_customer_contact_simplification"),
    ]

    operations = [
        migrations.AlterField(
            model_name="salesorder",
            name="status",
            field=models.CharField(
                choices=[
                    ("DRAFT", "Draft"),
                    ("SUBMITTED", "Submitted"),
                    ("AWAITING_PAYMENT", "Awaiting payment"),
                    ("PAYMENT_PROOF_UPLOADED", "Payment proof uploaded"),
                    ("VERIFIED", "Verified by owner"),
                    ("CANCELLED", "Cancelled"),
                ],
                db_index=True,
                default="AWAITING_PAYMENT",
                max_length=32,
                verbose_name="status",
            ),
        ),
    ]
