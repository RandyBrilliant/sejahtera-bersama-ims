from django.contrib import admin

from .models import OperationalCashEntry, OperationalCategory


@admin.register(OperationalCategory)
class OperationalCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "entry_kind", "sort_order", "is_active", "updated_at")
    list_filter = ("entry_kind", "is_active")
    search_fields = ("name", "slug", "description")


@admin.register(OperationalCashEntry)
class OperationalCashEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "occurred_on",
        "direction",
        "category",
        "amount_idr",
        "sales_order",
        "purchase_in_order",
        "reference",
        "created_at",
    )
    list_filter = ("direction", "occurred_on")
    search_fields = ("description", "reference", "category__name")
    date_hierarchy = "occurred_on"
