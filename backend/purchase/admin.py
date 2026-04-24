from django.contrib import admin

from .models import (
    Customer,
    CustomerProductPrice,
    PurchaseInLine,
    PurchaseInOrder,
    SalesOrder,
    SalesOrderLine,
)


class PurchaseInLineInline(admin.TabularInline):
    model = PurchaseInLine
    extra = 0


@admin.register(PurchaseInOrder)
class PurchaseInOrderAdmin(admin.ModelAdmin):
    list_display = ("order_code", "supplier_name", "status", "total_idr", "verified_at", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("order_code", "supplier_name", "invoice_number")
    inlines = [PurchaseInLineInline]


class SalesOrderLineInline(admin.TabularInline):
    model = SalesOrderLine
    extra = 0


@admin.register(SalesOrder)
class SalesOrderAdmin(admin.ModelAdmin):
    list_display = ("order_code", "customer", "status", "total_idr", "verified_at", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("order_code", "invoice_number", "customer__name")
    inlines = [SalesOrderLineInline]


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company_name", "phone", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "company_name", "phone", "email", "tax_id")


@admin.register(CustomerProductPrice)
class CustomerProductPriceAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "product_packaging", "selling_price_idr", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("customer__name", "note")
