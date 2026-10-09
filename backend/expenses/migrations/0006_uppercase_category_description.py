from django.db import migrations
from django.db.models.functions import Upper


def uppercase_category_description(apps, schema_editor):
    OperationalCategory = apps.get_model("expenses", "OperationalCategory")
    OperationalCategory.objects.update(description=Upper("description"))


class Migration(migrations.Migration):
    dependencies = [
        ("expenses", "0005_uppercase_cash_entry_text"),
    ]

    operations = [
        migrations.RunPython(uppercase_category_description, migrations.RunPython.noop),
    ]
