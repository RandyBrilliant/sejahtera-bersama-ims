from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CustomerProductPriceViewSet,
    CustomerViewSet,
    PurchaseInOrderViewSet,
    SalesOrderViewSet,
    SalesRevenueReportView,
)

app_name = "purchase"

router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customers")
router.register(r"customer-product-prices", CustomerProductPriceViewSet, basename="customer-product-prices")
router.register(r"purchase-in-orders", PurchaseInOrderViewSet, basename="purchase-in-orders")
router.register(r"sales-orders", SalesOrderViewSet, basename="sales-orders")

urlpatterns = [
    path("reports/sales-revenue/", SalesRevenueReportView.as_view(), name="sales-revenue-report"),
    path("", include(router.urls)),
]
