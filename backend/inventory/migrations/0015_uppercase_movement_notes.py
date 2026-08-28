from django.db import migrations
from django.db.models.functions import Upper


def uppercase_movement_notes(apps, schema_editor):
    IngredientStockMovement = apps.get_model("inventory", "IngredientStockMovement")
    ProductStockMovement = apps.get_model("inventory", "ProductStockMovement")
    ProductionBatch = apps.get_model("inventory", "ProductionBatch")
    IngredientStockMovement.objects.update(note=Upper("note"))
    ProductStockMovement.objects.update(note=Upper("note"))
    ProductionBatch.objects.update(
        note=Upper("note"),
        shift_label=Upper("shift_label"),
    )


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0014_productpackaging_packaging_type"),
    ]

    operations = [
        migrations.RunPython(uppercase_movement_notes, migrations.RunPython.noop),
    ]
