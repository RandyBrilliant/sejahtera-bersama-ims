from django_filters import rest_framework as filters

from .models import Customer, CustomerProductPrice, PurchaseInOrder, SalesOrder


class CustomerFilter(filters.FilterSet):
    class Meta:
        model = Customer
        fields = {
            "is_active": ["exact"],
            "name": ["icontains"],
            "phone": ["icontains"],
            "tax_id": ["icontains"],
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
    class Meta:
        model = PurchaseInOrder
        fields = {
            "status": ["exact"],
            "supplier_name": ["icontains"],
            "order_code": ["exact", "icontains"],
            "invoice_number": ["icontains"],
            "created_by": ["exact"],
        }


class SalesOrderFilter(filters.FilterSet):
    class Meta:
        model = SalesOrder
        fields = {
            "status": ["exact"],
            "customer": ["exact"],
            "order_code": ["exact", "icontains"],
            "invoice_number": ["icontains"],
            "created_by": ["exact"],
        }
