from django.db import migrations
from django.db.models.functions import Upper


def uppercase_customer_text(apps, schema_editor):
    Customer = apps.get_model("purchase", "Customer")
    Customer.objects.update(address=Upper("address"), notes=Upper("notes"))


class Migration(migrations.Migration):
    dependencies = [
        ("purchase", "0012_rename_verified_at_indexes"),
    ]

    operations = [
        migrations.RunPython(uppercase_customer_text, migrations.RunPython.noop),
    ]
