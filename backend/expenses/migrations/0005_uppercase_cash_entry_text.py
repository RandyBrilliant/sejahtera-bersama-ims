from django.db import migrations
from django.db.models.functions import Upper


def uppercase_cash_entry_text(apps, schema_editor):
    OperationalCashEntry = apps.get_model("expenses", "OperationalCashEntry")
    OperationalCashEntry.objects.update(
        description=Upper("description"),
        reference=Upper("reference"),
    )


class Migration(migrations.Migration):
    dependencies = [
        ("expenses", "0004_operationalcashentry_payment_method"),
    ]

    operations = [
        migrations.RunPython(uppercase_cash_entry_text, migrations.RunPython.noop),
    ]
