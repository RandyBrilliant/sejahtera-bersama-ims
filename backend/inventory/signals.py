"""Auto-create stok bahan baku (IngredientInventory) untuk setiap bahan baru."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Ingredient, IngredientInventory


@receiver(post_save, sender=Ingredient)
def ensure_ingredient_inventory(sender, instance: Ingredient, created: bool, **kwargs) -> None:
    if created:
        IngredientInventory.objects.get_or_create(ingredient=instance)
