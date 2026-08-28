from django.db import migrations
from django.db.models.functions import Upper


def uppercase_loan_notes(apps, schema_editor):
    PayrollLoanItem = apps.get_model("payroll", "PayrollLoanItem")
    PayrollLoanItem.objects.update(note=Upper("note"))


class Migration(migrations.Migration):
    dependencies = [
        ("payroll", "0009_payroll_loan_items_and_gaji_cash"),
    ]

    operations = [
        migrations.RunPython(uppercase_loan_notes, migrations.RunPython.noop),
    ]
