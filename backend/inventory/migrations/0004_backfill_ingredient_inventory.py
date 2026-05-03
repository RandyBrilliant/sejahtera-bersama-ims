"""Satu baris stok per bahan baku yang belum punya IngredientInventory."""

from django.db import migrations


def forwards(apps, schema_editor):
    from inventory.models import Ingredient, IngredientInventory

    for ing in Ingredient.objects.iterator():
        IngredientInventory.objects.get_or_create(ingredient=ing)


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0003_productpackaging_list_price_idr"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
