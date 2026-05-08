from django_filters import rest_framework as filters

from .models import Customer, CustomerProductPrice, PurchaseInOrder, SalesOrder


class CustomerFilter(filters.FilterSet):
    class Meta:
        model = Customer
        fields = {
            "is_active": ["exact"],
            "wilayah": ["exact"],
            "name": ["icontains"],
            "phone": ["icontains"],
            "address": ["icontains"],
        }


class CustomerProductPriceFilter(filters.FilterSet):
    class Meta:
        model = CustomerProductPrice
        fields = {
            "customer": ["exact"],
            "product_packaging": ["exact"],
            "is_active": ["exact"],
        }


class PurchaseInOrderFilter(filters.FilterSet):
    start_date = filters.DateFilter(method="filter_start_date")
    end_date = filters.DateFilter(method="filter_end_date")

    def filter_start_date(self, queryset, _name, value):
        return queryset.filter(created_at__date__gte=value)

    def filter_end_date(self, queryset, _name, value):
        return queryset.filter(created_at__date__lte=value)

    class Meta:
        model = PurchaseInOrder
        fields = {
            "status": ["exact"],
            "order_code": ["exact", "icontains"],
            "invoice_number": ["icontains"],
            "created_by": ["exact"],
        }


class SalesOrderFilter(filters.FilterSet):
    start_date = filters.DateFilter(method="filter_start_date")
    end_date = filters.DateFilter(method="filter_end_date")

    def filter_start_date(self, queryset, _name, value):
        return queryset.filter(created_at__date__gte=value)

    def filter_end_date(self, queryset, _name, value):
        return queryset.filter(created_at__date__lte=value)

    class Meta:
        model = SalesOrder
        fields = {
            "status": ["exact"],
            "customer": ["exact"],
            "order_code": ["exact", "icontains"],
            "invoice_number": ["icontains"],
            "created_by": ["exact"],
        }
