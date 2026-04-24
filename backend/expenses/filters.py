from django_filters import rest_framework as filters

from .models import OperationalCashEntry, OperationalCategory


class OperationalCategoryFilter(filters.FilterSet):
    class Meta:
        model = OperationalCategory
        fields = {
            "entry_kind": ["exact"],
            "is_active": ["exact"],
            "slug": ["exact"],
        }


class OperationalCashEntryFilter(filters.FilterSet):
    occurred_on_from = filters.DateFilter(field_name="occurred_on", lookup_expr="gte")
    occurred_on_to = filters.DateFilter(field_name="occurred_on", lookup_expr="lte")

    class Meta:
        model = OperationalCashEntry
        fields = {
            "direction": ["exact"],
            "category": ["exact"],
            "occurred_on": ["exact", "gte", "lte"],
            "created_by": ["exact"],
            "sales_order": ["exact"],
            "purchase_in_order": ["exact"],
        }
